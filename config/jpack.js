import fs from 'fs';
import path from 'path';

import {
    LogMe,
    jPackConfig,
    generateLessVariablesFromConfig,
    deleteLessVariablesFile
} from 'jizy-packer';

function availableIconsets() {
    const iconsPath = path.join(jPackConfig.get('basePath'), 'lib', 'iconsets');
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

const jPackData = function () {
    const lessBuildVariablesPath = path.join(jPackConfig.get('basePath'), 'lib/less/_variables.less');

    jPackConfig.sets({
        name: 'JdzCaptcha',
        alias: 'jdzcaptcha',
        lessVariables: {
            desktopBreakpoint: '900px',
            scrollbarWidth: '17px'
        },
        iconsets: []
    });

    jPackConfig.set('onCheckConfig', () => {
        // iconsets are theme/variant names (native or consumer-specific).
        // Native ones exist in lib/iconsets/{theme}/{variant}/ and will be copied to the
        // build output. Consumer-specific ones are skipped here — the consumer serves them
        // from their own path (e.g. [WEBSITE]/assets/icons/{theme}/{variant}/).
        const iconsets = jPackConfig.get('iconsets') ?? [];
        jPackConfig.set('iconsets', iconsets);

        if (iconsets.length > 0) {
            LogMe.log(`Iconsets declared: ${iconsets.map(s => s.theme + '/' + s.variant).join(', ')}`);
        }
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
        const iconsets = jPackConfig.get('iconsets') ?? [];
        const publicPath = path.join(targetPath, 'public');
        const assetsPath = path.join(targetPath, 'assets', 'jdzcaptcha');
        const nativeIconsPath = path.join(basePath, 'lib', 'iconsets');

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

        // Always copy placeholder.png (needed by the PHP backend regardless of iconsets).
        fs.mkdirSync(assetsPath, { recursive: true });
        const placeholderSrc = path.join(basePath, 'lib', 'placeholder.png');
        if (fs.existsSync(placeholderSrc)) {
            fs.copyFileSync(placeholderSrc, path.join(assetsPath, 'placeholder.png'));
            LogMe.log('Copied placeholder.png to assets/jdzcaptcha/');
        }

        // Copy native iconsets into assets/jdzcaptcha/{theme}/{variant}/ (consumer-specific
        // iconsets are skipped — the consumer serves those from their own path).
        const nativeSets = availableIconsets();
        const nativeSelected = iconsets.filter(set =>
            nativeSets.some(ok => ok.theme === set.theme && ok.variant === set.variant)
        );

        for (const { theme, variant } of nativeSelected) {
            const srcDir = path.join(nativeIconsPath, theme, variant);
            const destDir = path.join(assetsPath, theme, variant);

            fs.mkdirSync(destDir, { recursive: true });
            fs.readdirSync(srcDir)
                .filter(file => path.extname(file).toLowerCase() === '.png')
                .forEach(file => {
                    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
                });

            LogMe.log(`Copied native iconset: ${theme}/${variant}`);
        }

        // Clean up generated LESS variables
        deleteLessVariablesFile(lessBuildVariablesPath);
    });
};

export default jPackData;
