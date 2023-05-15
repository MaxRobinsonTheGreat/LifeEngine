import webpack from 'webpack';
import path from 'path';

type argv = { mode: 'development' | 'production' };

const config = (_env: any, argv: argv): webpack.Configuration => ({
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist/js/'),
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
        }),
    ],
    devtool: argv.mode === 'production' ? undefined : 'eval-source-map',
});

export default config;
