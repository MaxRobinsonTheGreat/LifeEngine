const SerializeHelper = {
    copyNonObjects(obj) {
        let newobj = {};
        for (let key in obj) {
            if (typeof obj[key] !== 'object')
                newobj[key] = obj[key];
        }
        return newobj;
    },
    overwriteNonObjects(copyFrom, copyTo) {
        for (let key in copyFrom) {
            if (typeof copyFrom[key] !== 'object' && typeof copyTo[key] !== 'object') {
                // only overwrite if neither are objects
                copyTo[key] = copyFrom[key];
            }
        }
    }
}

module.exports = SerializeHelper;