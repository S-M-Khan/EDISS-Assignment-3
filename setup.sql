-- /*  this file is created to consolidate 
-- init, schema, customerSeed, and bookSeed SQL files for simplified use with Docker
-- */

-- DROP DATABASE IF EXISTS bookdb;
-- DROP DATABASE IF EXISTS customerdb;

-- CREATE DATABASE bookdb;
-- CREATE DATABASE customerdb;



-- USE Bookstore;

-- -- DROP Book and Customer tables if they exists
-- DROP TABLE IF EXISTS Book;
-- DROP TABLE IF EXISTS Customer;

-- -- define the schema of tables Book and Customer

-- CREATE TABLE Book (
--     ISBN VARCHAR(100) PRIMARY KEY,
--     title VARCHAR(150) NOT NULL,
--     Author VARCHAR(100) NOT NULL,
--     description VARCHAR(150) NOT NULL,
--     genre VARCHAR(75) NOT NULL,
--     price DECIMAL(10, 2) NOT NULL,
--     quantity INT NOT NULL,
--     summary TEXT NOT NULL
-- );

-- CREATE TABLE Customer (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     userId VARCHAR(100) NOT NULL,
--     name VARCHAR(100) NOT NULL,
--     phone VARCHAR(20) NOT NULL,
--     address VARCHAR(100) NOT NULL,
--     address2 VARCHAR(100) NULL,
--     city VARCHAR(50) NOT NULL, 
--     state VARCHAR(2) NOT NULL,
--     zipcode VARCHAR(12) NOT NULL
-- );



-- -- seed the Book table with data

-- -- delete records before seeding
-- DELETE FROM Book;

-- INSERT INTO Book (ISBN,title,Author,description,genre,price,quantity,summary) VALUES ("978-0136886099", "Software Architecture in Practice", "Bass, L., Clements, P., Kazman, R.", "The definitive guide to architecting modern software systems", "non-fiction", 59.95, 99, "Comprehensive guide to software architecture patterns and practices"),
-- ("978-0321357444", "Refactoring: Improving the Design of Existing Code", "Martin Fowler", "Transforming software structure without changing behavior", "programming", 45.99, 75, "Essential techniques for improving code maintainability"),
-- ("978-0596517748", "High Performance Web Sites", "Steve Souders", "97 rules for faster web development", "web-development", 29.99, 150, "Practical optimization techniques from Yahoo's performance team"),
-- ("978-1492051719", "Designing Data-Intensive Applications", "Martin Kleppmann", "Reliable, scalable, and maintainable systems", "databases", 49.99, 50, "Deep dive into distributed systems and data architecture");



-- -- seed Customer table with data

-- -- delete records before seeding
-- DELETE FROM Customer;

-- INSERT INTO Customer(userId, name, phone, address, address2, city, state, zipcode) VALUES ("starlord2002@gmail.com", "Star Lord", "+14122144122", "48 Galaxy Rd", "Suite 4", "Fargo", "ND", "58102"),
-- ("gamora2023@gmail.com", "Gamora Zen", "+12025551234", "12 Guardian Way", "Apt 7B", "Knowhere", "XY", "99999"),
-- ("rocket.raccoon@contraband.net", "Rocket Raccoon", "+1800555BOOM", "3 Scrapyard Ln", NULL, "Xandar", "NX", "98765"),
-- ("groot@flora.org", "Groot", "+14125557666", "Branch 101", "The Pot", "Asgard", "AS", "54321");



-- create the Databases
DROP DATABASE IF EXISTS bookdb;
DROP DATABASE IF EXISTS customerdb;

CREATE DATABASE bookdb;
CREATE DATABASE customerdb;

-- setup bookdb (used only by book service)
USE bookdb;

DROP TABLE IF EXISTS Book;

CREATE TABLE Book (
    ISBN VARCHAR(100) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    Author VARCHAR(100) NOT NULL,
    description VARCHAR(150) NOT NULL,
    genre VARCHAR(75) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    summary TEXT NOT NULL
);

INSERT INTO Book (ISBN, title, Author, description, genre, price, quantity, summary) VALUES 
("978-0136886099", "Software Architecture in Practice", "Bass, L., Clements, P., Kazman, R.", "The definitive guide to architecting modern software systems", "non-fiction", 59.95, 99, "Comprehensive guide to software architecture patterns and practices"),
("978-0321357444", "Refactoring: Improving the Design of Existing Code", "Martin Fowler", "Transforming software structure without changing behavior", "programming", 45.99, 75, "Essential techniques for improving code maintainability"),
("978-0596517748", "High Performance Web Sites", "Steve Souders", "97 rules for faster web development", "web-development", 29.99, 150, "Practical optimization techniques from Yahoo's performance team"),
("978-1492051719", "Designing Data-Intensive Applications", "Martin Kleppmann", "Reliable, scalable, and maintainable systems", "databases", 49.99, 50, "Deep dive into distributed systems and data architecture");

-- setup customerdb (used only by customer service)
USE customerdb;

DROP TABLE IF EXISTS Customer;

CREATE TABLE Customer (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(100) NOT NULL,
    address2 VARCHAR(100) NULL,
    city VARCHAR(50) NOT NULL, 
    state VARCHAR(2) NOT NULL,
    zipcode VARCHAR(12) NOT NULL
);

INSERT INTO Customer(userId, name, phone, address, address2, city, state, zipcode) VALUES 
("starlord2002@gmail.com", "Star Lord", "+14122144122", "48 Galaxy Rd", "Suite 4", "Fargo", "ND", "58102"),
("gamora2023@gmail.com", "Gamora Zen", "+12025551234", "12 Guardian Way", "Apt 7B", "Knowhere", "XY", "99999"),
("rocket.raccoon@contraband.net", "Rocket Raccoon", "+1800555BOOM", "3 Scrapyard Ln", NULL, "Xandar", "NX", "98765"),
("groot@flora.org", "Groot", "+14125557666", "Branch 101", "The Pot", "Asgard", "AS", "54321");