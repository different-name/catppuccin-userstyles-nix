{
  description = "Generated Stylus storage.js for Catppuccin Userstyles";

  inputs = {
    catppuccin-userstyles = {
      url = "github:catppuccin/userstyles";
      flake = false;
    };

    flake-utils = {
      url = "github:numtide/flake-utils";
      inputs.systems.follows = "systems";
    };

    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    # https://github.com/NixOS/nixpkgs/pull/358223
    nixpkgs-deno.url = "github:nixos/nixpkgs/47ebca5fe22ffc9566e7d2ec11245a9db0135716";

    systems.url = "github:nix-systems/default-linux";
  };

  outputs =
    inputs:
    inputs.flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import inputs.nixpkgs { inherit system; };
        pkgs-deno = import inputs.nixpkgs-deno { inherit system; };

        stylus-storage-gen = pkgs.callPackage ./pkgs/stylus-storage-gen.nix {
          inherit (pkgs-deno) deno;
        };

        catppuccin-stylus-storage =
          (pkgs.callPackage ./pkgs/catppuccin-stylus-storage.nix {
            inherit stylus-storage-gen;
          }).overrideAttrs
            {
              src = inputs.catppuccin-userstyles;
            };
      in
      {
        packages = {
          inherit stylus-storage-gen catppuccin-stylus-storage;
        };
      }
    );
}
