-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 02-04-2025 a las 12:51:15
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `proyectos`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `operaciones`
--

CREATE TABLE `operaciones` (
  `id` int(11) NOT NULL,
  `operacion` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `script_text` varchar(250) NOT NULL,
  `entradas` int(11) DEFAULT 0,
  `salidas` int(11) DEFAULT 0,
  `confi` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `operaciones`
--

INSERT INTO `operaciones` (`id`, `operacion`, `descripcion`, `script_text`, `entradas`, `salidas`, `confi`) VALUES
(129, 'Juntar Columnassss', 'Junta columna de un archivo', 'joinColumn.js', 1, 1, '{\"separator1\":\"_\",\"separator2\":\"_\",\"joinFiles\":[\"month\",\"day\",\"hour\",\"min\"]}'),
(130, 'Crear Grupos', 'Crea grupos de datos', 'createGroups.js', 1, 2, '{\"groups\": [{\"output\": \"function_level\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"n_px\",\"n_p\",\"truth\"]},{\"output\": \"function_drive\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"i_uiip\",\"i_f\",\"i_uiipu\",\"truth\"]},{\"output\": \"function_pressure\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"p_uiip\",\"p_f\",\"p_pu\",\"truth\"]},{\"output\": \"function_flow\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"ce_px\",\"cs_px\",\"c_pu_p\",\"truth\"]},{\"output\": \"position_plaXiquet\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"n_px\",\"ce_px\",\"cs_px\",\"truth\"]},{\"output\": \"position_playa\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"n_p\",\"i_uiip\",\"p_uiip\",\"truth\"]},{\"output\": \"position_falcon\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"i_f\",\"p_f\",\"truth\"]},{\"output\": \"position_pueblo\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"i_uiipu\",\"c_pu_p\",\"p_pu\",\"truth\"]}]}'),
(131, 'Crear Plantilla de  Nulos y Normalización ', 'Crear plantilla de valores nulos y normalización', 'createTemplate.js', 1, 2, '{\"nulls\": \"0\",\"normalize1\": \"0\",\"normalize2\": \"1\"}}'),
(132, 'Crear Plantilla de Peso', 'Crear Plantilla de Peso de un archivo', 'createWeight.js', 1, 2, '{\"weight\": \"1\"}'),
(133, 'Eliminar Columnas', 'Elimina columnas de un archivo', 'deleteColumn.js', 1, 1, '{\"delete\": [\"﻿num\"]}'),
(134, 'Eliminar Truth', 'Elimina Truth de un archivo', 'deleteTruth.js', 1, 1, '{\"delete\": [\"truth\"]}'),
(135, 'Codificar', 'Codifica un archivo', 'encoding.js', 2, 1, '{\"expandedValue\":\"#fill#\", \"headers\":\"header,value,key\", \"fillTransform\":\"mean\", \"_\":[\"none\",\"zero\",\"one\",\"mean\",\"median\"]}'),
(138, 'Nulos', 'Elimina valores nulos de un archivo', 'nulls.js', 2, 1, '{\"remove\": [\"R\", \"r\", \"D\", \"d\"]}'),
(143, 'Añadir columnas', 'Añadir columnas a un archivo', 'addColumn.js', 1, 1, '{\"columnName\":[\"truth\"], \"value\":[0]}');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proyectos`
--

CREATE TABLE `proyectos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `last_modified` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `archivo` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `proyectos`
--

INSERT INTO `proyectos` (`id`, `nombre`, `descripcion`, `last_modified`, `archivo`) VALUES
(85, 'Proyecto Principals', 'Proyecto para hacer pruebas', '2025-04-01 08:53:02', 'waterInfrastructure.csv'),
(106, 'sss', 'sss', '2025-04-01 08:55:00', 'Encoding_s1.csv');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proyecto_operacion`
--

CREATE TABLE `proyecto_operacion` (
  `id` int(11) NOT NULL,
  `id_proyecto` int(11) NOT NULL,
  `id_operacion` int(11) NOT NULL,
  `entrada` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`entrada`)),
  `salida` text DEFAULT NULL,
  `confi` text DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `orden` int(11) NOT NULL,
  `positionIndex` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `operaciones`
--
ALTER TABLE `operaciones`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `proyectos`
--
ALTER TABLE `proyectos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `proyecto_operacion`
--
ALTER TABLE `proyecto_operacion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_proyecto` (`id_proyecto`),
  ADD KEY `id_operacion` (`id_operacion`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `operaciones`
--
ALTER TABLE `operaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=144;

--
-- AUTO_INCREMENT de la tabla `proyectos`
--
ALTER TABLE `proyectos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=107;

--
-- AUTO_INCREMENT de la tabla `proyecto_operacion`
--
ALTER TABLE `proyecto_operacion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1791;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `proyecto_operacion`
--
ALTER TABLE `proyecto_operacion`
  ADD CONSTRAINT `proyecto_operacion_ibfk_1` FOREIGN KEY (`id_proyecto`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `proyecto_operacion_ibfk_2` FOREIGN KEY (`id_operacion`) REFERENCES `operaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
