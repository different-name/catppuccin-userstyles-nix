{
  lib,
  stdenv,
  deno,
  makeWrapper,
}:
let
  pname = "stylus-storage-gen";

  src = builtins.path {
    path = ../stylus-storage-gen;
    name = pname + "-src";
  };
in
stdenv.mkDerivation {
  inherit pname src;
  version = "0.1.0";

  denoDeps = deno.fetchDeps {
    inherit pname src;
    hash = "sha256-hIE+NirinnzDri7iz7gkLPINjibF64//yChz/2F0GP8=";
    denoInstallFlags = lib.cli.toGNUCommandLine { } {
      entrypoint = "./scripts/stylus-storage/main.ts";
    };
  };

  nativeBuildInputs = [
    deno.setupHook
    makeWrapper
  ];

  installPhase = ''
    mkdir -p $out/share/lib $out/bin
    cp -r . $out/share/lib/

    makeShellWrapper '${lib.getExe deno}' "$out/bin/stylus-storage-gen" \
      --add-flags "run --cached-only --allow-read --allow-write --allow-env" \
      --add-flag "$out/share/lib/scripts/stylus-storage/main.ts" \
      --inherit-argv0
  '';

  meta = {
    description = "Stylus storage.js file generator, compatible with Catppuccin Userstyles";
    license = with lib.licenses; [ mit ];
    platforms = lib.platforms.all;
    mainProgram = "stylus-storage-gen";
  };
}
