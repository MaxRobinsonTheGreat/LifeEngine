const SerializeHelper = {
    copyNonObjects(obj) {
        let newobj = {};
        for (let key in obj) {
            if (typeof obj[key] !== 'object')
                newobj[key] = obj[key];
        }
        return newobj;
    }
}

module.exports = SerializeHelper;