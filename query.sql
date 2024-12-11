-- Create the database if it doesn't already exist
CREATE DATABASE IF NOT EXISTS proactively_backend;

-- Use the newly created database
USE proactively_backend;

-- Create the user_login table
CREATE TABLE user_login (
    user_id INT AUTO_INCREMENT PRIMARY KEY, 
    first_name VARCHAR(45) NOT NULL,      
    last_name VARCHAR(45) NOT NULL,       
    email VARCHAR(45) UNIQUE NOT NULL,     
    user_password VARCHAR(45) NOT NULL,    
    is_logged_in TINYINT(1) DEFAULT 0,    
    login_time TIMESTAMP DEFAULT NULL     
);

-- Create the speaker_login table
CREATE TABLE speaker_login (
    user_id INT AUTO_INCREMENT PRIMARY KEY, 
    first_name VARCHAR(45) NOT NULL,       
    last_name VARCHAR(45) NOT NULL,       
    email VARCHAR(45) UNIQUE NOT NULL,     
    user_password VARCHAR(45) NOT NULL,    
    is_logged_in TINYINT(1) DEFAULT 0,     
    login_time TIMESTAMP DEFAULT NULL     
);

-- Create the speaker_profiles table
CREATE TABLE speaker_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,               
    speaker_id INT NOT NULL,                                
    email VARCHAR(255) NOT NULL,                           
    expertise VARCHAR(255) NOT NULL,                       
    price_per_session DECIMAL(10, 2) NOT NULL,              
    bio TEXT,                                               
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,          
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
    FOREIGN KEY (speaker_id) REFERENCES speaker_login(user_id) , 
    FOREIGN KEY (email) REFERENCES speaker_login(email)         
);

-- Create the bookings table
CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,             
    speaker_id INT NOT NULL,                                
    speaker_email VARCHAR(255) NOT NULL,                 
    booking_date DATE NOT NULL,                           
    time_slot TIME NOT NULL,                               
    booked BOOLEAN NOT NULL DEFAULT FALSE,              
    UNIQUE (speaker_id, booking_date, time_slot),         
    FOREIGN KEY (speaker_id) REFERENCES speaker_login(user_id) , 
    FOREIGN KEY (speaker_email) REFERENCES speaker_login(email)  
);
