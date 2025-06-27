# catppuccin-userstyles-nix

Generate Stylus settings with Catppuccin Userstyles configured & installed

> [!WARNING]
> This flake is in early development and may be unstable
> 
> Please report bugs or request features via the [issues tab](https://github.com/different-name/catppuccin-userstyles-nix/issues)

## Usage

Add `catppuccin-userstyles-nix` to your flake inputs

```nix
catppuccin-userstyles-nix = {
  url = "github:different-name/catppuccin-userstyles-nix";
  inputs.nixpkgs.follows = "nixpkgs";
};
```

### Install via Home Manager Module (Firefox, LibreWolf, Floorp)

You can configure Stylus settings declaratively using the Firefox, LibreWolf, or Floorp Home Manager modules

This flake provides a `stylusSettings.<system>` function that generates Stylus settings with Catppuccin Userstyles configured & installed

```nix
let
  profile = "YOUR_PROFILE_NAME";

  catppuccinStylusSettings = inputs.catppuccin-userstyles-nix.stylusSettings.${pkgs.system} {
    # global userstyle settings
    global = {
      lightFlavor = "latte";
      darkFlavor = "mocha";
      accentColor = "red";
    };

    # per-userstyle settings
    "Userstyle GitHub Catppuccin" = {
      darkFlavor = "frappe";
      accentColor = "mauve";
    };
  };
in
{
  programs.firefox.profiles.${profile}.extensions = {
    # install Stylus (from NUR https://github.com/nix-community/NUR)
    packages = with pkgs.nur.repos.rycee.firefox-addons; [
      stylus
    ];

    settings = {
      # UUID of the Stylus extension — fixed for all installs
      "{7a7a4a92-a2a0-41d1-9fd7-1e92480d612d}" = {
        settings = catppuccinStylusSettings // {
          # optional: additional Stylus settings
        };
      };
    };
  };
}
```

### Manual install via `home.file`

Another option is to install the `catppuccin-stylus-storage` package directly through `home.file`:

```nix
let
  profile = "YOUR_PROFILE_NAME";
  inherit (inputs.catppuccin-userstyles-nix.packages.${pkgs.system}) catppuccin-stylus-storage;
in
{
  home.file = {
    ".mozilla/firefox/${profile}/browser-extension-data/{7a7a4a92-a2a0-41d1-9fd7-1e92480d612d}/storage.js".source =
      catppuccin-stylus-storage + /share/storage.js;
  };
}
```

## Acknowledgements

- https://github.com/catppuccin/userstyles for the userstyles & base script
