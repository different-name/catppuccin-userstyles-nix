{
  description = "Generate Stylus settings with Catppuccin Userstyles configured & installed";

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

    systems.url = "github:nix-systems/default-linux";
  };

  outputs =
    inputs:
    inputs.flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import inputs.nixpkgs { inherit system; };

        stylus-storage-gen = pkgs.callPackage ./pkgs/stylus-storage-gen.nix { };

        catppuccin-stylus-storage =
          builtins.warn
            ''
              catppuccin-userstyles-nix has been superseded and is now deprecated
              The project has moved a fork of catppuccin/nix:
                https://github.com/different-name/catppuccin-nix/tree/userstyles
              Follow the PR progress here:
                https://github.com/catppuccin/nix/pull/591
            ''
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

        stylusSettings =
          userstylesOptions:
          pkgs.lib.pipe catppuccin-stylus-storage [
            (pkg: pkg.override { inherit userstylesOptions; })
            (dir: dir + /share/storage.js)
            builtins.readFile
            builtins.fromJSON
          ];
      }
    );
}
