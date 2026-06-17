// Iteration binary: runs the native parser (no wasm) to validate the JSON.
// Usage: native <input.dem> [output.json] [frameRate]
use std::fs;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("usage: native <input.dem> [output.json] [frameRate]");
        std::process::exit(1);
    }
    let bytes = fs::read(&args[1]).expect("read demo");
    let frame_rate: u32 = args.get(3).and_then(|s| s.parse().ok()).unwrap_or(8);
    let on_progress = |stage: u32, cur: u32, total: u32| {
        if stage == 0 && total > 0 {
            eprintln!("[native] parse {:.0}%", cur as f32 / total as f32 * 100.0);
        }
    };
    match cs2_demo_parser_wasm::parse_all(&bytes, frame_rate, on_progress) {
        Ok((json, voice)) => {
            if let Some(out) = args.get(2) {
                fs::write(out, &json).expect("write output");
                // Voice blob next to the JSON: <output>.voice
                let voice_out = format!("{out}.voice");
                fs::write(&voice_out, &voice).expect("write voice");
                eprintln!(
                    "[native] ok -> {} ({} bytes) | voice -> {} ({} bytes)",
                    out, json.len(), voice_out, voice.len()
                );
            } else {
                println!("{}", &json[..json.len().min(2000)]);
                eprintln!("[native] voice blob: {} bytes", voice.len());
            }
        }
        Err(e) => {
            eprintln!("[native] error: {}", e);
            std::process::exit(1);
        }
    }
}
