// Test file for snapshot functionality
function greetUser(name: string): string {
    return `Hello, ${name}! Welcome to our application.`;
}

function calculateSum(a: number, b: number): number {
    return a + b;
}

const result = calculateSum(5, 3);
console.log(greetUser("World"));
console.log(`Sum: ${result}`);

export { greetUser, calculateSum };
