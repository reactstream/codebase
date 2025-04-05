const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        main: './src/index.js',
        // Use proper entry points for Monaco workers
        'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
        'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker.js',
        'html.worker': 'monaco-editor/esm/vs/language/html/html.worker.js',
        'css.worker': 'monaco-editor/esm/vs/language/css/css.worker.js',
        'json.worker': 'monaco-editor/esm/vs/language/json/json.worker.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].bundle.js',
        globalObject: 'self',
        publicPath: '/'
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        fallback: {
            "path": require.resolve("path-browserify"),
            "fs": false // Empty module for fs
        }
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', 'postcss-loader']
            },
            {
                test: /\.(woff|woff2|ttf|eot|svg|png|jpg|gif)$/,
                type: 'asset/resource'
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            excludeChunks: ['editor.worker', 'ts.worker', 'html.worker', 'css.worker', 'json.worker']
        }),
        new MonacoWebpackPlugin({
            languages: ['javascript', 'typescript', 'html', 'css', 'json']
        })
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin(),
            new CssMinimizerPlugin()
        ],
        splitChunks: {
            chunks: 'all',
            name: 'vendors'
        },
        runtimeChunk: 'single'
    }
};
