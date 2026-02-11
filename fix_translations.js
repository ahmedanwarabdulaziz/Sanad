const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, 'messages', 'ar.json');
const enPath = path.join(__dirname, 'messages', 'en.json');

function fixAr() {
    try {
        const content = fs.readFileSync(arPath, 'utf8');
        const ar = JSON.parse(content);

        if (ar.SanadZayed && ar.SanadZayed.milestonePage) {
            console.log('Found nested milestonePage in ar.json, moving to root...');
            ar.milestonePage = ar.SanadZayed.milestonePage;
            delete ar.SanadZayed.milestonePage;

            // Write back with 4 spaces indent
            fs.writeFileSync(arPath, JSON.stringify(ar, null, 4), 'utf8');
            console.log('Successfully updated ar.json');
            return ar.milestonePage;
        } else {
            console.log('ar.json: milestonePage not found in SanadZayed or already fixed.');
            return ar.milestonePage || null;
        }
    } catch (e) {
        console.error('Error fixing ar.json:', e);
        return null;
    }
}

function fixEn(milestonePageStructure) {
    try {
        const content = fs.readFileSync(enPath, 'utf8');
        const en = JSON.parse(content);

        if (!en.milestonePage && milestonePageStructure) {
            console.log('Adding milestonePage skeleton to en.json...');

            // Helper to create TODO values while preserving structure
            const createSkeleton = (obj) => {
                if (typeof obj === 'string') return "TODO";
                if (Array.isArray(obj)) return obj.map(item => typeof item === 'string' ? "TODO" : createSkeleton(item));
                if (typeof obj === 'object' && obj !== null) {
                    const newObj = {};
                    for (const key in obj) {
                        newObj[key] = createSkeleton(obj[key]);
                    }
                    return newObj;
                }
                return "TODO";
            };

            en.milestonePage = createSkeleton(milestonePageStructure);

            // Write back with 2 spaces indent
            fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
            console.log('Successfully updated en.json');
        } else {
            console.log('en.json already has milestonePage or no structure provided.');
        }
    } catch (e) {
        console.error('Error fixing en.json:', e);
    }
}

const milestonePageData = fixAr();
if (milestonePageData) {
    fixEn(milestonePageData);
}
