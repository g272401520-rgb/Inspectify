-- Limpiar datos existentes (opcional, comentar si no quieres borrar)
-- DELETE FROM finding_photos;
-- DELETE FROM findings;
-- DELETE FROM inspections;
-- DELETE FROM checklist_items;
-- DELETE FROM checklists;
-- DELETE FROM areas;

-- Cargar áreas
INSERT INTO areas (id, name, responsible, created_at) VALUES
('0c2fce30-8290-4896-8279-77ed6dce91da', 'Zona de agroquímicos', 'Maikol García', '2025-10-18T14:59:53.879495+00:00'),
('29843f86-277f-45fd-b02e-ef0aa53729a0', 'Gestión Ambiental', 'Maykol Pretell', '2025-10-16T22:15:40.351247+00:00'),
('3534c172-c9db-4a99-8327-72b2831ef01a', 'Producción Alcohol', 'Jose Tapia', '2025-10-16T22:15:19.709575+00:00'),
('725ab2c3-ab46-4842-9790-a080628d6a1c', 'MU', 'Edgar Lucano', '2025-10-16T22:14:53.766766+00:00'),
('df222430-776c-4efa-aed2-3b7445365ffc', 'Producción Refinería', 'Shirley Rimarachin', '2025-10-16T22:14:43.016187+00:00'),
('f2ebdb79-b233-4a38-ae4a-c0f66503b83e', 'Producción Rubia', 'Juan Caballero', '2025-10-16T22:14:34.717826+00:00')
ON CONFLICT (id) DO NOTHING;

-- Cargar checklist
INSERT INTO checklists (id, name, area_id, type, created_at) VALUES
('1c081a8c-dd35-4d90-ae74-e2a1cb2bc652', 'Sostenibilidad FERT', '0c2fce30-8290-4896-8279-77ed6dce91da', 'normal', '2025-10-18T15:00:52.673051+00:00')
ON CONFLICT (id) DO NOTHING;

-- Cargar items del checklist
INSERT INTO checklist_items (id, checklist_id, category, criterion, subcriterion, details, position) VALUES
('e64e8fdb-44db-4803-9eaf-200e2d4a93d1', '1c081a8c-dd35-4d90-ae74-e2a1cb2bc652', 'Almacenamiento y Manipulación de Agroquímicos', 'Equipos y recipientes', NULL, 'Los equipos y recipientes de preparación se encuentran en un adecuado estado de conservación', 0),
('7c049e5a-c522-42e2-a44d-e1119aef8f59', '1c081a8c-dd35-4d90-ae74-e2a1cb2bc652', 'Almacenamiento y Manipulación de Agroquímicos', 'Equipos de medición', NULL, 'Se cuenta con equipos de medición para garantizar la precisión de las mezclas, incluidos recipientes con líneas de graduación y balanzas calibradas', 1),
('b3ea6048-4675-4e28-b6c7-5dcfcd281904', '1c081a8c-dd35-4d90-ae74-e2a1cb2bc652', 'Prevención y Atención de Emergencias', 'Contenedores de material', NULL, 'Cuenta con los materiales mínimos para lidiar con posibles derrames, establecidos en un lugar fijo y señalizado: - Contenedores de material absorbente - Pala y escoba - Bolsas de residuos - Guantes de protección - Mascarilla - Gafas de protección', 2)
ON CONFLICT (id) DO NOTHING;
