export type Store = {
  markdown: string;
  html: string;
  css: string;
};

export const defaults: Store = {
  markdown:
    "# MARKDOWN\n\nThis is a little cute paragraph!\n\n- asd\n- asd\n- asd",
  html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta http-equiv="X-UA-Compatible" content="IE=edge">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>CV</title>\n    <style>\n        {{css}}\n    </style>\n</head>\n<body>\n    {{markdown}}\n</body>\n</html>',
  css: "html {\n    font-family: 'Courier New', Courier, monospace;\n}\n\nP {\n    border: 1px solid black;\n}",
};
