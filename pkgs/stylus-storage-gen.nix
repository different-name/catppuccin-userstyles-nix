{
  lib,
  buildNpmPackage,
}:
buildNpmPackage (finalAttrs: {
  pname = "stylus-storage-gen";
  version = "0.2.0";

  src = builtins.path {
    path = ../stylus-storage-gen;
    name = finalAttrs.pname + "-src";
  };

  npmDepsHash = "sha256-lD9SbhexYCu0yYRkNihLz3xRMMwrl3Ls3aV2EDe5k5U=";

  meta = {
    description = "Stylus storage.js file generator, compatible with Catppuccin Userstyles";
    license = with lib.licenses; [ mit ];
    platforms = lib.platforms.all;
    mainProgram = "stylus-storage-gen";
  };
})
