# Replit Nix Configuration for RIKA 2.0
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.npm-9_6_4
    pkgs.nodePackages.typescript-language-server
    pkgs.yarn
    pkgs.replitPackages.jest
  ];
}