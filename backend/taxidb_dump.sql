CREATE DATABASE  IF NOT EXISTS `taxidb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `taxidb`;
-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: taxidb
-- ------------------------------------------------------
-- Server version	8.4.5

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin` (
  `admin_id` int(5) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone_number` char(10) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`admin_id`),
  CONSTRAINT `admin_chk_1` CHECK (regexp_like(`phone_number`,_utf8mb4'^[0-9]{10}$'))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin`
--

LOCK TABLES `admin` WRITE;
/*!40000 ALTER TABLE `admin` DISABLE KEYS */;
INSERT INTO `admin` VALUES (00001,'jasmineadmin','Jasmine','9988776655','jasmine@gmail.com'),(00002,'raviadmin','Ravi','9998887776','ravi@gmail.com'),(00003,'akbaradmin','Akbar','9999888877','akbar@gmail.com'),(00004,'shilpaadmin','Shilpa Bhat','9999988888','shilpabhat@gmail.com'),(00005,'jasmineadmin','Jasmine','9988776655','jasmine@gmail.com'),(00006,'raviadmin','Ravi','9998887776','ravi@gmail.com'),(00007,'akbaradmin','Akbar','9999888877','akbar@gmail.com'),(00008,'shilpaadmin','Shilpa Bhat','9999988888','shilpabhat@gmail.com');
/*!40000 ALTER TABLE `admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commission`
--

DROP TABLE IF EXISTS `commission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commission` (
  `commission_id` int(5) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `ride_id` int(5) unsigned zerofill NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `commission_date_time` datetime DEFAULT NULL,
  PRIMARY KEY (`commission_id`),
  KEY `ride_id` (`ride_id`),
  CONSTRAINT `commission_ibfk_1` FOREIGN KEY (`ride_id`) REFERENCES `ride` (`ride_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commission`
--

LOCK TABLES `commission` WRITE;
/*!40000 ALTER TABLE `commission` DISABLE KEYS */;
/*!40000 ALTER TABLE `commission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `customer_id` int(5) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone_number` char(10) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`customer_id`),
  CONSTRAINT `customer_chk_1` CHECK (regexp_like(`phone_number`,_utf8mb4'^[0-9]{10}$'))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer`
--

LOCK TABLES `customer` WRITE;
/*!40000 ALTER TABLE `customer` DISABLE KEYS */;
INSERT INTO `customer` VALUES (00001,'allen123','Allen','9876543212','allen@gmail.com'),(00002,'thanush123','Thanush Reddy','9506543212','thanushr@gmail.com'),(00003,'prakash123','Prakash Bhat','9870003212','prakash@gmail.com'),(00004,'david123','David Martinez','9333343212','davidmartinez@gmail.com'),(00005,'ganesh123','Ganesh Kini','9879943212','ganesh@gmail.com'),(00006,'akash123','Akash Kini','9509943212','akashk@gmail.com'),(00007,'ash','Ash','9988111111','ash@gmail.com');
/*!40000 ALTER TABLE `customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driver`
--

DROP TABLE IF EXISTS `driver`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver` (
  `driver_id` int(5) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone_number` char(10) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `vehicle_id` int(5) unsigned zerofill DEFAULT NULL,
  `admin_id` int(5) unsigned zerofill NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`driver_id`),
  KEY `idx_driver_is_active` (`is_active`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `driver_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`),
  CONSTRAINT `driver_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`),
  CONSTRAINT `chk_active_driver_has_vehicle` CHECK (((`is_active` = false) or (`vehicle_id` is not null))),
  CONSTRAINT `driver_chk_1` CHECK (regexp_like(`phone_number`,_utf8mb4'^[0-9]{10}$'))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver`
--

LOCK TABLES `driver` WRITE;
/*!40000 ALTER TABLE `driver` DISABLE KEYS */;
INSERT INTO `driver` VALUES (00001,'driverjane','Jane Smith','9999999908','janesmith@gmail.com',00001,00001,1),(00002,'driverbane','Bane Matthews','9559999908','banemathew@gmail.com',00002,00001,1),(00003,'driverjinesh','Jinesh Shenoy','9551199908','jinesh@gmail.com',00003,00002,1),(00004,'dikshith1','Dikshith','9501179908','dikshith@gmail.com',00004,00002,1),(00005,'premak','Prema Kulkarni','9111170008','premakdriver@gmail.com',00005,00002,1),(00006,'hiteshdriver','Hitesh','9600007765','hiteshbtc@gmail.com',00006,00003,1),(00007,'jiteshdriver','Jitesh Bhat','9696977651','jiteshbhat@gmail.com',00007,00003,1);
/*!40000 ALTER TABLE `driver` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment`
--

DROP TABLE IF EXISTS `payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment` (
  `payment_id` int(5) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `ride_id` int(5) unsigned zerofill NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('credit card','debit card','net banking') NOT NULL,
  `payment_status` enum('pending','complete') NOT NULL,
  `payment_date_time` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `ride_id` (`ride_id`),
  CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`ride_id`) REFERENCES `ride` (`ride_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment`
--

LOCK TABLES `payment` WRITE;
/*!40000 ALTER TABLE `payment` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rating`
--

DROP TABLE IF EXISTS `rating`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rating` (
  `rating_id` int(5) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `ride_id` int(5) unsigned zerofill NOT NULL,
  `score` tinyint DEFAULT NULL,
  PRIMARY KEY (`rating_id`),
  KEY `ride_id` (`ride_id`),
  CONSTRAINT `rating_ibfk_1` FOREIGN KEY (`ride_id`) REFERENCES `ride` (`ride_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rating`
--

LOCK TABLES `rating` WRITE;
/*!40000 ALTER TABLE `rating` DISABLE KEYS */;
/*!40000 ALTER TABLE `rating` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ride`
--

DROP TABLE IF EXISTS `ride`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ride` (
  `ride_id` int(5) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `customer_id` int(5) unsigned zerofill NOT NULL,
  `driver_id` int(5) unsigned zerofill DEFAULT NULL,
  `pickup_location` varchar(255) NOT NULL,
  `dropoff_location` varchar(255) NOT NULL,
  `distance` decimal(10,2) NOT NULL,
  `taxi_type` enum('sedan','hatchback','suv') NOT NULL,
  `ride_status` enum('drafted','payment done','request accepted','destination reached') NOT NULL,
  `booking_date_time` datetime NOT NULL,
  `verification_code` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`ride_id`),
  KEY `customer_id` (`customer_id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `ride_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  CONSTRAINT `ride_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`driver_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ride`
--

LOCK TABLES `ride` WRITE;
/*!40000 ALTER TABLE `ride` DISABLE KEYS */;
/*!40000 ALTER TABLE `ride` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_ride_status_transition_check` BEFORE UPDATE ON `ride` FOR EACH ROW BEGIN
    DECLARE is_valid_transition BOOLEAN DEFAULT FALSE;
    DECLARE old_status_val VARCHAR(50);
    DECLARE new_status_val VARCHAR(50);
    DECLARE error_message VARCHAR(255);
    IF NEW.ride_status != OLD.ride_status THEN
        SET old_status_val = OLD.ride_status;
        SET new_status_val = NEW.ride_status;
        SET is_valid_transition = FALSE;
        CASE old_status_val
            WHEN 'drafted' THEN
                IF new_status_val = 'payment done' THEN SET is_valid_transition = TRUE; END IF;
            WHEN 'payment done' THEN
                IF new_status_val = 'request accepted' THEN SET is_valid_transition = TRUE; END IF;
            WHEN 'request accepted' THEN
                IF new_status_val = 'destination reached' THEN SET is_valid_transition = TRUE; END IF;
            WHEN 'destination reached' THEN
                SET is_valid_transition = FALSE;
            ELSE
                SET is_valid_transition = FALSE;
        END CASE;
        IF NOT is_valid_transition THEN
            SET error_message = CONCAT('Invalid ride status transition attempted: FROM ''', old_status_val, ''' TO ''', new_status_val, '''.');
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = error_message;
        END IF;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `vehicle`
--

DROP TABLE IF EXISTS `vehicle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle` (
  `vehicle_id` int(5) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` enum('sedan','hatchback','suv') NOT NULL,
  PRIMARY KEY (`vehicle_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle`
--

LOCK TABLES `vehicle` WRITE;
/*!40000 ALTER TABLE `vehicle` DISABLE KEYS */;
INSERT INTO `vehicle` VALUES (00001,'Mahindra Scorpio','suv'),(00002,'Suzuki Baleno','hatchback'),(00003,'Mahindra Bolero','suv'),(00004,'Honda Civic','sedan'),(00005,'Volkswagen Polo','hatchback'),(00006,'Ford Ecosports','suv'),(00007,'Suzuki Alto','hatchback');
/*!40000 ALTER TABLE `vehicle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'taxidb'
--

--
-- Dumping routines for database 'taxidb'
--
/*!50003 DROP FUNCTION IF EXISTS `CalculateDriverCommission` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `CalculateDriverCommission`(p_distance DECIMAL(10,2)) RETURNS decimal(10,2)
    DETERMINISTIC
BEGIN
    DECLARE total_fare DECIMAL(10,2);
    DECLARE commission_amount DECIMAL(10,2);
    DECLARE commission_rate DECIMAL(3,2) DEFAULT 0.40;
    SET total_fare = CalculateRideFare(p_distance);
    IF total_fare IS NULL THEN
        SET commission_amount = 0.00;
    ELSE
        SET commission_amount = total_fare * commission_rate;
    END IF;
    RETURN commission_amount;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `CalculateRideFare` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `CalculateRideFare`(p_distance DECIMAL(10,2)) RETURNS decimal(10,2)
    DETERMINISTIC
BEGIN
    DECLARE fare DECIMAL(10,2);
    IF p_distance IS NULL OR p_distance <= 0 THEN
        SET fare = 50.00;
    ELSE
        SET fare = 50.00 + (p_distance * 10.00);
    END IF;
    RETURN fare;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-06 20:54:07
