const mix = require('laravel-mix');
require('laravel-mix-compress');

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 |
 | Mix provides a clean, fluent API for defining some Webpack build steps
 | for your Laravel applications. By default, we are compiling the CSS
 | file for the application as well as bundling up all the JS files.
 |
 */

 mix.setResourceRoot('../');

 mix.webpackConfig({
  stats: {
       children: true
  },
  target: 'browserslist:browserslist config, not maintained node versions'
});

mix.js("resources/js/app.js", "public/js").vue()
    .postCss("resources/css/app.css", "public/css", [
      require("tailwindcss"),
    ]).version().options({
      fileLoaderDirs:  {
          fonts: "./public/fonts"
      },
      autoprefixer: { remove: false }
    }).sourceMaps();

mix.compress({
  productionOnly: true,
  minRatio: 1
});