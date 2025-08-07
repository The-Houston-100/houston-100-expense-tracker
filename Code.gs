/**
 * Houston 100 Expense Tracker - Google Apps Script Backend
 * 
 * This script serves as the API layer between the Netlify frontend 
 * and Google Sheets database. It handles all CRUD operations and 
 * provides automated expense tracking functionality.
 * 
 * Author: Houston 100 Team
 * Created: August 2025
 */

// Configuration Constants
const SHEET_NAME = 'Expenses'; // Name of the sheet tab containing expense data
const TIMEZONE = 'America/Chicago'; // Houston timezone

/**
 * Initialize the expense sheet with proper headers if it doesn't exist
 */
function initializeExpenseSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Check if headers exist
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (!headers[0]) {
    // Add headers
    const headerRow = [
      'Date',
      'Category', 
      'Description',
      'Amount',
      'Payment Method',
      'Member Name',
      'Project',
      'Notes',
      'Created At',
      'Updated At'
    ];
    
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    
    // Format the header row
    sheet.getRange(1, 1, 1, headerRow.length)
      .setBackground('#4285f4')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    
    // Set column widths for better readability
    sheet.setColumnWidth(1, 100); // Date
    sheet.setColumnWidth(2, 120); // Category
    sheet.setColumnWidth(3, 200); // Description
    sheet.setColumnWidth(4, 100); // Amount
    sheet.setColumnWidth(5, 120); // Payment Method
    sheet.setColumnWidth(6, 150); // Member Name
    sheet.setColumnWidth(7, 120); // Project
    sheet.setColumnWidth(8, 200); // Notes
    
    // Set data validation for categories
    const categoryRange = sheet.getRange(2, 2, 1000, 1);
    const categoryRule = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        'Office Supplies',
        'Technology',
        'Marketing',
        'Travel',
        'Meals & Entertainment',
        'Professional Services',
        'Training & Education',
        'Utilities',
        'Rent',
        'Insurance',
        'Other'
      ])
      .build();
    categoryRange.setDataValidation(categoryRule);
    
    // Set data validation for payment methods
    const paymentRange = sheet.getRange(2, 5, 1000, 1);
    const paymentRule = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        'Cash',
        'Credit Card',
        'Debit Card',
        'Check',
        'Bank Transfer',
        'PayPal',
        'Venmo',
        'Other'
      ])
      .build();
    paymentRange.setDataValidation(paymentRule);
  }
}

/**
 * Handle GET requests - retrieve expense data
 */
function doGet(e) {
  try {
    initializeExpenseSheet();
    
    const action = e.parameter.action || 'getAll';
    
    switch(action) {
      case 'getAll':
        return getResponse(getAllExpenses());
      case 'getByMonth':
        return getResponse(getExpensesByMonth(e.parameter.year, e.parameter.month));
      case 'getCategories':
        return getResponse(getCategories());
      case 'getSummary':
        return getResponse(getExpenseSummary());
      default:
        return getResponse(getAllExpenses());
    }
  } catch (error) {
    return getErrorResponse(error.message);
  }
}

/**
 * Handle POST requests - create, update, or delete expenses
 */
function doPost(e) {
  try {
    initializeExpenseSheet();
    
    const requestBody = JSON.parse(e.postData.contents);
    const action = requestBody.action;
    
    switch(action) {
      case 'create':
        return getResponse(createExpense(requestBody.data));
      case 'update':
        return getResponse(updateExpense(requestBody.id, requestBody.data));
      case 'delete':
        return getResponse(deleteExpense(requestBody.id));
      case 'bulk':
        return getResponse(bulkCreateExpenses(requestBody.data));
      default:
        return getErrorResponse('Invalid action specified');
    }
  } catch (error) {
    return getErrorResponse(error.message);
  }
}

/**
 * Get all expenses from the sheet
 */
function getAllExpenses() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return [];
  }
  
  const headers = data[0];
  const expenses = [];
  
  for (let i = 1; i < data.length; i++) {
    const expense = {};
    headers.forEach((header, index) => {
      expense[header] = data[i][index];
    });
    expense.id = i; // Use row number as ID
    expenses.push(expense);
  }
  
  return expenses.reverse(); // Show newest first
}

/**
 * Get expenses for a specific month
 */
function getExpensesByMonth(year, month) {
  const allExpenses = getAllExpenses();
  return allExpenses.filter(expense => {
    if (!expense.Date) return false;
    const expenseDate = new Date(expense.Date);
    return expenseDate.getFullYear() == year && expenseDate.getMonth() + 1 == month;
  });
}

/**
 * Get unique categories
 */
function getCategories() {
  const allExpenses = getAllExpenses();
  const categories = [...new Set(allExpenses.map(expense => expense.Category).filter(Boolean))];
  return categories.sort();
}

/**
 * Get expense summary
 */
function getExpenseSummary() {
  const allExpenses = getAllExpenses();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const thisMonthExpenses = allExpenses.filter(expense => {
    if (!expense.Date) return false;
    const expenseDate = new Date(expense.Date);
    return expenseDate.getFullYear() == currentYear && expenseDate.getMonth() + 1 == currentMonth;
  });
  
  const totalThisMonth = thisMonthExpenses.reduce((sum, expense) => sum + (parseFloat(expense.Amount) || 0), 0);
  const totalAllTime = allExpenses.reduce((sum, expense) => sum + (parseFloat(expense.Amount) || 0), 0);
  
  const categoryTotals = {};
  allExpenses.forEach(expense => {
    const category = expense.Category || 'Uncategorized';
    categoryTotals[category] = (categoryTotals[category] || 0) + (parseFloat(expense.Amount) || 0);
  });
  
  return {
    totalThisMonth,
    totalAllTime,
    expenseCountThisMonth: thisMonthExpenses.length,
    expenseCountAllTime: allExpenses.length,
    categoryTotals,
    recentExpenses: allExpenses.slice(0, 5)
  };
}

/**
 * Create a new expense
 */
function createExpense(expenseData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'MM/dd/yyyy HH:mm:ss');
  
  const newRow = [
    expenseData.date || new Date(),
    expenseData.category || '',
    expenseData.description || '',
    parseFloat(expenseData.amount) || 0,
    expenseData.paymentMethod || '',
    expenseData.memberName || '',
    expenseData.project || '',
    expenseData.notes || '',
    timestamp, // Created At
    timestamp  // Updated At
  ];
  
  sheet.appendRow(newRow);
  
  return {
    success: true,
    message: 'Expense created successfully',
    id: sheet.getLastRow() - 1,
    timestamp: timestamp
  };
}

/**
 * Update an existing expense
 */
function updateExpense(id, expenseData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rowIndex = parseInt(id) + 1; // Convert ID back to row number
  
  if (rowIndex < 2 || rowIndex > sheet.getLastRow()) {
    throw new Error('Invalid expense ID');
  }
  
  const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'MM/dd/yyyy HH:mm:ss');
  
  const updatedRow = [
    expenseData.date || new Date(),
    expenseData.category || '',
    expenseData.description || '',
    parseFloat(expenseData.amount) || 0,
    expenseData.paymentMethod || '',
    expenseData.memberName || '',
    expenseData.project || '',
    expenseData.notes || '',
    sheet.getRange(rowIndex, 9).getValue(), // Keep original Created At
    timestamp  // Updated At
  ];
  
  sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
  
  return {
    success: true,
    message: 'Expense updated successfully',
    id: id,
    timestamp: timestamp
  };
}

/**
 * Delete an expense
 */
function deleteExpense(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rowIndex = parseInt(id) + 1; // Convert ID back to row number
  
  if (rowIndex < 2 || rowIndex > sheet.getLastRow()) {
    throw new Error('Invalid expense ID');
  }
  
  sheet.deleteRow(rowIndex);
  
  return {
    success: true,
    message: 'Expense deleted successfully',
    id: id
  };
}

/**
 * Create multiple expenses at once
 */
function bulkCreateExpenses(expensesData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'MM/dd/yyyy HH:mm:ss');
  
  const newRows = expensesData.map(expenseData => [
    expenseData.date || new Date(),
    expenseData.category || '',
    expenseData.description || '',
    parseFloat(expenseData.amount) || 0,
    expenseData.paymentMethod || '',
    expenseData.memberName || '',
    expenseData.project || '',
    expenseData.notes || '',
    timestamp, // Created At
    timestamp  // Updated At
  ]);
  
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
  
  return {
    success: true,
    message: `${newRows.length} expenses created successfully`,
    count: newRows.length,
    timestamp: timestamp
  };
}

/**
 * Trigger function that runs when the sheet is edited manually
 */
function onEdit(e) {
  try {
    const range = e.range;
    const sheet = e.source.getActiveSheet();
    
    if (sheet.getName() === SHEET_NAME && range.getRow() > 1) {
      // Update the "Updated At" timestamp when any cell is edited
      const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'MM/dd/yyyy HH:mm:ss');
      sheet.getRange(range.getRow(), 10).setValue(timestamp);
      
      // Log the change for debugging
      console.log(`Expense updated in row ${range.getRow()}, column ${range.getColumn()}`);
    }
  } catch (error) {
    console.error('Error in onEdit trigger:', error.message);
  }
}

/**
 * Set up necessary triggers for the expense tracker
 */
function setupTriggers() {
  // Delete existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new edit trigger
  ScriptApp.newTrigger('onEdit')
    .onEdit()
    .create();
    
  return {
    success: true,
    message: 'Triggers set up successfully'
  };
}

/**
 * Generate monthly expense report
 */
function generateMonthlyReport(year, month) {
  const expenses = getExpensesByMonth(year, month);
  const total = expenses.reduce((sum, expense) => sum + (parseFloat(expense.Amount) || 0), 0);
  
  const categoryBreakdown = {};
  expenses.forEach(expense => {
    const category = expense.Category || 'Uncategorized';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + (parseFloat(expense.Amount) || 0);
  });
  
  return {
    month: `${month}/${year}`,
    totalExpenses: total,
    expenseCount: expenses.length,
    categoryBreakdown,
    expenses
  };
}

/**
 * Helper function to create standardized API responses
 */
function getResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

/**
 * Helper function to create error responses
 */
function getErrorResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

/**
 * Handle CORS preflight requests
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}
