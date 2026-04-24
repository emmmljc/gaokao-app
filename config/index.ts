import {defineConfig, type UserConfigExport} from '@tarojs/cli'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig<'webpack5'>(async (merge) => {
    const baseConfig: UserConfigExport<'webpack5'> = {
        projectName: 'gaokao-app',
        date: '2025-6-1',
        designWidth: 375,
        deviceRatio: {
            640: 2.34 / 2,
            750: 1,
            375: 2,
            828: 1.81 / 2,
        },
        sourceRoot: 'src',
        outputRoot: 'dist',
        plugins: [],
        defineConstants: {},
        copy: {
            patterns: [],
            options: {},
        },
        framework: 'react',
        compiler: 'webpack5',
        cache: {
            enable: false,
        },
        mini: {
            postcss: {
                pxtransform: {
                    enable: true,
                    config: {
                        selectorBlackList: ['nut-'],
                    },
                },
                cssModules: {
                    enable: false,
                    config: {
                        namingPattern: 'module',
                        generateScopedName: '[name]__[local]___[hash:base64:5]',
                    },
                },
            },
            webpackChain(chain) {
                chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
                chain.merge({
                    ignoreWarnings: [
                        {
                            module: /taro-video-core\.js/,
                            message: /webpackExports/,
                        },
                    ],
                })
            },
        },
        h5: {
            publicPath: '/',
            staticDirectory: 'static',
            miniCssExtractPluginOption: {
                ignoreOrder: true,
                filename: 'css/[name].[hash].css',
                chunkFilename: 'css/[name].[chunkhash].css',
            },
            postcss: {
                autoprefixer: {
                    enable: true,
                    config: {},
                },
                cssModules: {
                    enable: false,
                    config: {
                        namingPattern: 'module',
                        generateScopedName: '[name]__[local]___[hash:base64:5]',
                    },
                },
            },
            webpackChain(chain) {
                chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
                chain.resolve.alias.set('@tarojs/router', require.resolve('@tarojs/taro-h5/node_modules/@tarojs/router'))
                chain.merge({
                    ignoreWarnings: [
                        {module: /taro-video-core\.js/, message: /webpackExports/},
                    ]
                })
            },
            devServer: {
                port: 3000,
                proxy: {
                    '/api': {
                        target: 'http://localhost:8080',
                        changeOrigin: true,
                    },
                },
            },
        },
        rn: {
            appName: 'gaokao-app',
            output: {
                ios: './ios/main.jsbundle',
                iosAssetsDest: './ios',
                android: './android/app/src/main/assets/index.android.bundle',
                androidAssetsDest: './android/app/src/main/res',
            },
            postcss: {
                cssModules: {
                    enable: false,
                },
            },
        },
        weapp: {
            // 禁用 prebundle 以避免模块加载错误
            compiler: {
                type: 'webpack5',
                prebundle: {
                    enable: false,
                },
            },
            postcss: {
                autoprefixer: {
                    enable: true,
                    config: {},
                },
                pxtransform: {
                    enable: true,
                    config: {
                        selectorBlackList: ['nut-'],
                    },
                },
                cssModules: {
                    enable: false,
                    config: {
                        namingPattern: 'module',
                        generateScopedName: '[name]__[local]___[hash:base64:5]',
                    },
                },
            },
            webpackChain(chain) {
                chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
                chain.merge({
                    ignoreWarnings: [
                        {
                            module: /taro-video-core\.js/,
                            message: /webpackExports/,
                        },
                    ],
                })
                // 添加 postcss 插件处理 WXSS 兼容性问题
                chain.module
                    .rule('sass')
                    .oneOf('0')
                    .use('postcss-loader')
                    .tap((options) => {
                        options = options || {}
                        options.postcssOptions = options.postcssOptions || {}
                        options.postcssOptions.plugins = options.postcssOptions.plugins || []
                        // 添加自定义插件移除 * 选择器
                        options.postcssOptions.plugins.push(
                            require('./postcss-weapp-fix.js')()
                        )
                        return options
                    })
            },
        },
    }
    if (process.env.NODE_ENV === 'development') {
        return merge({}, baseConfig, devConfig)
    }
    return merge({}, baseConfig, prodConfig)
})
