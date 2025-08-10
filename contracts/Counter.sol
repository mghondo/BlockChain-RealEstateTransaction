// Filename: Counter.sol
// This contract provides a simple counter implementation with named counters that can be incremented, decremented, and renamed. It demonstrates basic Solidity state management and getter/setter patterns for educational purposes.

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0; // Specifies the Solidity compiler version for the contract

// Counter contract implementing a basic counter with name functionality
contract Counter {
  // Public state variable storing the counter's name
  string public name;
  // Public state variable storing the current count value
  uint public count;

  // Constructor to initialize the counter with a name and initial count value
  constructor(string memory _name, uint _initialCount) {
    name = _name; // Set the counter's name from constructor parameter
    count = _initialCount; // Set the initial count value from constructor parameter
  }

  // Function to increment the counter by 1 and return the new count value
  function increment() public returns (uint newCount) {
    count++; // Increase count by 1 using pre-increment operator
    return count; // Return the updated count value
  }

  // Function to decrement the counter by 1 and return the new count value
  function decrement() public returns (uint newCount) {
    count--; // Decrease count by 1 using pre-decrement operator
    return count; // Return the updated count value
  }

  // View function to get the current count without modifying state
  function getCount() public view returns (uint) {
    return count; // Return the current count value (redundant with public variable but shows pattern)
  }

  // View function to get the current name without modifying state
  function getName() public view returns (string memory currentName) {
    return name; // Return the current name (redundant with public variable but shows pattern)
  }

  // Function to update the counter's name and return the new name
  function setName(
    string memory _newName // Parameter for the new name to set
  ) public returns (string memory newName) {
    name = _newName; // Update the name state variable with new value
    return name; // Return the updated name for confirmation
  }
}

// Comprehensive Counter Contract Summary:
// Counter.sol is a foundational Solidity contract that demonstrates essential smart contract patterns including state variables, constructor initialization,
// and basic CRUD operations. The contract maintains two pieces of state: a string name and a uint count, both declared as public for automatic getter generation.
// The constructor accepts parameters to initialize both the name and starting count, allowing for flexible deployment configurations. The increment and decrement
// functions modify the count state while returning the new value, demonstrating both state modification and return value patterns common in Solidity.

// This contract serves as an excellent learning tool for beginners to understand Solidity fundamentals including data types, visibility specifiers, function
// modifiers (public, view), and return value handling. The getName and getCount functions are technically redundant since public variables automatically
// generate getter functions, but they demonstrate explicit getter patterns useful in more complex scenarios. The setName function shows how to update
// string state variables and return confirmation values, which is valuable for front-end integration and testing.

// While simple, this contract could be extended with access control (using OpenZeppelin's Ownable), events for state change notifications, bounds checking
// for the counter to prevent overflow/underflow, or multiple counter support using mappings. For production use, consider adding proper licensing, comprehensive
// tests, and security audits, though the current implementation poses minimal risk due to its simplicity and lack of value transfer functionality.
