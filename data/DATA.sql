CREATE TABLE DATA (
    id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(50),
    address VARCHAR(50),
    address2 VARCHAR(50),
    products VARCHAR(50),
    car VARCHAR(50),
    moviegenre VARCHAR(50)
);

CREATE TABLE Passenger (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(50)
);

CREATE TABLE Flight (
    id INT PRIMARY KEY,
    flight_number VARCHAR(20),
    destination VARCHAR(50)
);

CREATE TABLE Ticket (
    id INT PRIMARY KEY,
    passenger_id INT,
    flight_id INT,
    seat VARCHAR(10),
    FOREIGN KEY (passenger_id) REFERENCES Passenger(id) ON DELETE CASCADE,
    FOREIGN KEY (flight_id) REFERENCES Flight(id) ON DELETE CASCADE
);
