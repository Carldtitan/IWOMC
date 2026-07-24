use environment_REDACTED_companion::build_info;

fn main() {
    let info = build_info();
    println!(
        "environment-REDACTED-companion {} protocol-v{}",
        info.version, info.protocol_version
    );
}
