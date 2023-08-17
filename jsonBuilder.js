function formToJson(formData){

    return rebuildArray(rebuildObject(formData));

}


function rebuildObject(object) {
    const output = {};

    for (const key in object) {
        const value = object[key];
        const keys = key.split('.');

        // Function to cast values to appropriate types
        const castValue = (val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            if (val === "null") return null;
            if (!isNaN(val)) return parseFloat(val);
            return val;
        };

        let currentObj = output;
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];

            if (!currentObj.hasOwnProperty(k)) {
                if (i === keys.length - 1) {
                    currentObj[k] = castValue(value);
                } else {
                    if (!isNaN(keys[i + 1])) {
                        currentObj[k] = [];
                    } else {
                        currentObj[k] = {};
                    }
                }
            }

            currentObj = currentObj[k];
        }
    }

    return output;
}

function rebuildArray(constructedObject) {
    let areAllKeysNumbers = true;
    for (const key in constructedObject) {
        if (isNaN(key)) {
            areAllKeysNumbers = false;
            break;
        }
    }

    if (areAllKeysNumbers) {
        const newObject = [];
        for (const key in constructedObject) {
            newObject.push(constructedObject[key]);
        }
        return newObject;
    } else {
        return constructedObject;
    }
}

exports.formToJson = (object) => {
    return formToJson(object);
};