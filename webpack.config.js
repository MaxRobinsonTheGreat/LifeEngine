const path = require('path');
const webpack = require("webpack");

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist/js/'),
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
        })
    ]
};