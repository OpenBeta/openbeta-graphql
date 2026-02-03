{
  description = "Openbeta  Back-end Development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            duckdb
          ];

          shellHook = ''
            echo "Bun development environment ready"
            bun --version
            alias install-postgis='psql -d openbeta -c "CREATE EXTENSION postgis;"'
            alias schema-reset='dropdb openbeta && createdb openbeta --owner=openbeta && install-postgis && bunx drizzle-kit migrate'
          '';
        };
      }
    );
}
