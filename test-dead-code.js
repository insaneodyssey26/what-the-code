"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usedArrowFunction = void 0;
exports.exportedFunction = exportedFunction;
// Unused function
function unusedFunction() {
    console.log('This function is never called');
}
// Used function
function usedFunction() {
    console.log('This function is called');
}
// Unused variable
const unusedVariable = 'This variable is never used';
// Used variable
const usedVariable = 'This variable is used';
// Possibly unused function (not exported)
function helperFunction() {
    return 'helper';
}
// Exported function (should not be flagged)
function exportedFunction() {
    usedFunction();
    console.log(usedVariable);
    return helperFunction();
}
// Unused arrow function
const unusedArrowFunction = () => {
    return 'unused';
};
// Used arrow function
const usedArrowFunction = () => {
    return 'used';
};
exports.usedArrowFunction = usedArrowFunction;
//# sourceMappingURL=test-dead-code.js.map