-- Server version: 5.7.24
-- PHP Version: 7.4.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;

--
-- Database: `dump1090`
--

-- --------------------------------------------------------

--
-- Table structure for table `aircraft_icao24`
--

CREATE TABLE `aircraft_icao24` (
  `icao24` varchar(8) NOT NULL,
  `r` varchar(255) DEFAULT NULL COMMENT 'registration',
  `t` varchar(64) DEFAULT NULL COMMENT 'typecode',
  `type` varchar(255) DEFAULT NULL COMMENT 'manufacturername + model',
  `short` varchar(255) DEFAULT NULL COMMENT 'short name',
  `trail` int(1) NOT NULL DEFAULT '0' COMMENT 'Trail',
  `owner` varchar(255) DEFAULT NULL,
  `op` varchar(255) DEFAULT NULL COMMENT 'operator',
  `operatoricao` varchar(24) DEFAULT NULL,
  `operatorcallsign` varchar(128) DEFAULT NULL,
  `interesting` int(1) NOT NULL DEFAULT '0' COMMENT '"int" - intresting',
  `image` varchar(64) DEFAULT NULL,
  `icaoaircrafttype` varchar(8) DEFAULT NULL,
  `airforce` varchar(255) DEFAULT NULL COMMENT 'force',
  `country` varchar(512) DEFAULT NULL,
  `m` varchar(255) DEFAULT NULL COMMENT 'manufacturername / manufacturericao',
  `model` varchar(255) DEFAULT NULL COMMENT 'model',
  `serialnumber` varchar(128) DEFAULT NULL,
  `registered` varchar(15) DEFAULT NULL COMMENT 'registered',
  `built` int(4) DEFAULT NULL,
  `engines` varchar(512) DEFAULT NULL,
  `categoryDescription` varchar(512) DEFAULT NULL,
  `notes` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `aircraft_icao24`
--

INSERT INTO `aircraft_icao24` (`icao24`, `r`, `t`, `type`, `short`, `trail`, `owner`, `op`, `operatoricao`, `operatorcallsign`, `interesting`, `image`, `icaoaircrafttype`, `airforce`, `country`, `m`, `model`, `serialnumber`, `registered`, `built`, `engines`, `categoryDescription`, `notes`) VALUES
('000000', NULL, NULL, 'unknow', NULL, 0, '', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'NULL', NULL);

--
-- Indexes for table `aircraft_icao24`
--
ALTER TABLE `aircraft_icao24`
  ADD PRIMARY KEY (`icao24`);
COMMIT;
