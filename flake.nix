{
  description = "Openbeta  Back-end Development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
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
          buildInputs = [
            pkgs.bun
            pkgs.duckdb
          ];

          shellHook = ''
            echo "Bun development environment ready"
            bun --version

            alias schema-reset='dropdb openbeta && createdb openbeta --owner=openbeta'
          '';
        };
      }
    );
}
