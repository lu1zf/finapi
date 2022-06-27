const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find(customer => customer.cpf == cpf);

  if (!customer) {
    return response.status(400).json({ error: "customer not found" })
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  if (!statement.length) return 0;

  const balance = statement.reduce((acc, operation) => {
    const { type, amount } = operation;
    return type === 'credit' ? acc + amount : acc - amount;
  }, 0);

  return balance;
}

function createStatementOperation(description, amount, type) {
  const statementOperation = {
    amount,
    created_at: new Date(),
    type,
  }

  if (description !== '') {
    statementOperation.description = description;
  }

  return statementOperation;
}
/**
 * cpf: string
 * name: string
 * id: uuid
 * statement: array
*/
app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(customer => customer.cpf === cpf);

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists" });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  });

  return response.status(201).send();
});

app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});

app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(statement => statement.created_at.toDateString() === dateFormat.toDateString());

  return response.json(statement);
});

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { description, amount } = request.body;

  const statementOperation = createStatementOperation(description, amount, 'credit');
  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { amount } = request.body

  const balance = getBalance(customer.statement);

  if (balance < amount) return response.status(400).json({
    error: "Insuficient funds"
  });

  const statementOperation = createStatementOperation('', amount, 'debit');
  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).send(customers);
});

app.get("/accounts", (request, response) => {
  return response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
});

app.listen(3333);