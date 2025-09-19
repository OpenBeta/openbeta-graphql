{
  pkgs ? import <nixpkgs> {
    config = {
      allowUnfree = true;
    };
  },
}:
pkgs.mkShell {
  buildInputs = with pkgs; [
    mongodb-tools
    (yarn.override { nodejs = nodejs_18; })
    mongodb-ce
    mongodb-compass
    mongosh
    gsettings-desktop-schemas
  ];

  # MONGOMS_DOWNLOAD_URL = "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2404-8.0.1.tgz";
  MONGOMS_DISTRO = "ubuntu-22.04";
  MONGOMS_RUNTIME_DOWNLOAD = false;
  MONGOMS_SYSTEM_BINARY = "${pkgs.mongodb-ce}/bin/mongod";
  # you will need to keep this value in sync with the pre-built mongodb-ce
  # (or you can use the mongodb package which will build from source and take a WHILE)
  # https://github.com/NixOS/nixpkgs/blob/nixos-unstable/pkgs/by-name/mo/mongodb-ce/package.nix#L113
  MONGOMS_VERSION = "7.0.14";

  shellHook = ''

    set -a
    source .env
    mongo_cnx="$MONGO_SCHEME://$MONGO_INITDB_ROOT_USERNAME:$MONGO_INITDB_ROOT_PASSWORD@$MONGO_SERVICE/$MONGO_DBNAME?authSource=$MONGO_AUTHDB&tls=$MONGO_TLS"

    # mongotop alias
    alias mto="mongotop --uri=$mongo_cnx"
    # mongostat alias
    alias mst="mongostat --uri=$mongo_cnx"
    # Compass tooling
    alias compass="mongodb-compass --theme=dark $mongo_cnx"

    echo "🧗 Alle!"
  '';
}
