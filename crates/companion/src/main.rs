use environment_reconciler_companion::build_info;

fn main() {
    let info = build_info();
    println!(
        "environment-reconciler-companion {} protocol-v{}",
        info.version, info.protocol_version
    );
}
