// Test file for dead code analysis
import React from 'react'; // This might be unused
import { useState, useEffect } from 'react'; // useState might be unused
import * as fs from 'fs'; // This might be unused

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
export function exportedFunction() {
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

export { usedArrowFunction };
