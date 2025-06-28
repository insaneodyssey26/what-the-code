"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.greetUser = greetUser;
exports.calculateSum = calculateSum;
// Test file for snapshot functionality
function greetUser(name) {
    return `Hello, ${name}! Welcome to our application.`;
}
function calculateSum(a, b) {
    return a + b;
}
const result = calculateSum(5, 3);
console.log(greetUser("World"));
console.log(`Sum: ${result}`);
//# sourceMappingURL=test-snapshot.js.map