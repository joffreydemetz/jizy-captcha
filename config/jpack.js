import fs from 'fs';
import path from 'path';

import {
    LogMe,
    jPackConfig,
    generateLessVariablesFromConfig,
    deleteLessVariablesFile
} from 'jizy-packer';

function parseCustomArgs() {
    const args = process.argv.slice(2);
    let theme = null;
    let variant = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--theme' && i + 1 < args.length) {
            theme = args[i + 1];
            i++;
        } else if (args[i] === '--variant' && i + 1 < args.length) {
            variant = args[i + 1];
            i++;
        }
    }

    return { theme, variant };
}

function discoverIconsets(iconsPath) {
    if (!fs.existsSync(iconsPath)) {
        return [];
    }

    const results = [];

    fs.readdirSync(iconsPath)
        .filter(f => fs.statSync(path.join(iconsPath, f)).isDirectory())
        .forEach(theme => {
            const themePath = path.join(iconsPath, theme);
            fs.readdirSync(themePath)
                .filter(f => fs.statSync(path.join(themePath, f)).isDirectory())
                .forEach(variant => {
                    results.push({ theme, variant });
                });
        });

    return results;
}

function collectIconsets(iconsPath, action, theme, variant) {
    let sets = discoverIconsets(iconsPath);

    if (action === 'build' && theme) {
        sets = sets.filter(s => s.theme === theme);
        if (variant) {
            sets = sets.filter(s => s.variant === variant);
        }
    }

    if (sets.length === 0) {
        console.error(`No matching iconsets found for theme="${theme}", variant="${variant}"`);
    }

    return sets;
}

const jPackData = function () {
    const lessBuildVariablesPath = path.join(jPackConfig.get('basePath'), 'lib/less/_variables.less');

    jPackConfig.sets({
        name: 'JdzCaptcha',
        alias: 'jdzcaptcha',
        lessVariables: {
            desktopBreakpoint: '900px',
            scrollbarWidth: '17px'
            // add your custom less variables here
        }
    });

    jPackConfig.set('onCheckConfig', () => {
        const iconsPath = path.join(jPackConfig.get('basePath'), 'lib', 'iconsets');
        jPackConfig.set('iconsPath', iconsPath);

        const { theme, variant } = parseCustomArgs();
        const action = jPackConfig.get('action');

        const iconsets = collectIconsets(iconsPath, action, theme, variant);
        jPackConfig.set('iconsets', iconsets);

        LogMe.log(`Iconsets to export: ${iconsets.map(s => s.theme + '/' + s.variant).join(', ')}`);

        // No rollup icon imports — icons are copied directly in onPacked
        jPackConfig.set('icons', []);
    });

    jPackConfig.set('onGenerateBuildJs', (code) => {
        LogMe.log('Build lib/less/_variables.less');
        const lessVariables = jPackConfig.get('lessVariables') ?? {};
        const lessOriginalVariablesPath = path.join(jPackConfig.get('basePath'), 'lib/less/variables.less');
        generateLessVariablesFromConfig(lessOriginalVariablesPath, lessBuildVariablesPath, lessVariables);
        return code;
    });

    jPackConfig.set('onGenerateWrappedJs', (wrapped) => wrapped);

    jPackConfig.set('onPacked', () => {
        const targetPath = jPackConfig.get('targetPath');
        const basePath = jPackConfig.get('basePath');
        const iconsPath = jPackConfig.get('iconsPath');
        const iconsets = jPackConfig.get('iconsets');
        const publicPath = path.join(targetPath, 'public');
        const assetsPath = path.join(targetPath, 'assets');

        // Move js/, css/ into public/
        fs.mkdirSync(publicPath, { recursive: true });

        for (const folder of ['js', 'css']) {
            const src = path.join(targetPath, folder);
            if (fs.existsSync(src)) {
                const dest = path.join(publicPath, folder);
                fs.mkdirSync(dest, { recursive: true });
                fs.readdirSync(src).forEach(file => {
                    fs.renameSync(path.join(src, file), path.join(dest, file));
                });
                fs.rmdirSync(src);
            }
        }

        // Copy placeholder.png to assets/
        fs.mkdirSync(assetsPath, { recursive: true });
        const placeholderSrc = path.join(basePath, 'lib', 'placeholder.png');
        if (fs.existsSync(placeholderSrc)) {
            fs.copyFileSync(placeholderSrc, path.join(assetsPath, 'placeholder.png'));
            LogMe.log('Copied placeholder.png to assets/');
        }

        // Copy icons from lib/iconsets/ to assets/icons/ preserving theme/variant structure
        for (const { theme, variant } of iconsets) {
            const srcDir = path.join(iconsPath, theme, variant);
            const destDir = path.join(assetsPath, 'icons', theme, variant);

            if (!fs.existsSync(srcDir)) {
                LogMe.log(`Icon source not found: ${srcDir}`);
                continue;
            }

            fs.mkdirSync(destDir, { recursive: true });

            fs.readdirSync(srcDir)
                .filter(file => path.extname(file).toLowerCase() === '.png')
                .forEach(file => {
                    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
                });

            LogMe.log(`Copied icons: ${theme}/${variant}`);
        }

        // Clean up generated LESS variables
        deleteLessVariablesFile(lessBuildVariablesPath);
    });
};

export default jPackData;
