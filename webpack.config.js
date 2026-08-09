const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const config = {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devServer: {
    static: './build',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'node_modules', 'blockly', 'media'),
          to: 'media',
        },
      ],
    }),
  ],
};

module.exports = (env, argv) => {
  if (argv.mode === 'development') {
    config.output.path = path.resolve(__dirname, 'build');
    config.devtool = 'eval-cheap-module-source-map';
    config.module.rules.push({
      test: /(blockly[/\\].*\.js)$/,
      use: [require.resolve('source-map-loader')],
      enforce: 'pre',
    });
    config.ignoreWarnings = [/Failed to parse source map.*blockly/];
  }
  return config;
};
