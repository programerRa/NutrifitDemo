CREATE TABLE roles(
	id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	role_name VARCHAR( 255 )
);

INSERT INTO roles( role_name ) VALUES
    ('CLIENTE'), ('NUTRICIONISTA'), ('INSTRUCTOR');
	
CREATE TABLE users(
	id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	role_id INT NOT NULL,
	name VARCHAR( 255 ) NOT NULL,
	lastname VARCHAR( 255 ) NOT NULL,
	dni VARCHAR( 20 ) NOT NULL UNIQUE,
	phone_number VARCHAR( 20 ) NOT NULL,
	birthdate DATE NOT NULL,
	email VARCHAR( 255 ) NOT NULL UNIQUE,
	password VARCHAR( 255 ) NOT NULL,
	is_active BOOLEAN DEFAULT TRUE,

	FOREIGN KEY ( role_id ) REFERENCES roles( id )
);

-- nutricionistas
CREATE TABLE nutritionists(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    residential_area VARCHAR( 255 ) NOT NULL,
    professional_title VARCHAR( 255 ) NOT NULL,
    professional_license VARCHAR( 100 ) NOT NULL,

    FOREIGN KEY ( user_id ) REFERENCES users( id ) ON DELETE CASCADE
);

-- instructores
CREATE TABLE instructors(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    residential_area VARCHAR( 255 ) NOT NULL,
    training_title VARCHAR( 255 ) NOT NULL,
    registration_number VARCHAR( 100 ),

    FOREIGN KEY ( user_id ) REFERENCES users( id ) ON DELETE CASCADE
);

-- clientes
CREATE TABLE clients(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    height_cm INT,
    main_goal VARCHAR( 255 ),
    medical_conditions TEXT,
    nutritionist_id INT,
    instructor_id INT,

    FOREIGN KEY ( user_id ) REFERENCES users( id ) ON DELETE CASCADE,
    FOREIGN KEY ( nutritionist_id ) REFERENCES nutritionists( id ) ON DELETE SET NULL,
    FOREIGN KEY ( instructor_id ) REFERENCES instructors( id ) ON DELETE SET NULL
);

-- especialidad
CREATE TABLE specialties(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR( 150 ) NOT NULL UNIQUE
);

-- nutricionista_especialidad
CREATE TABLE nutritionist_specialties(
    nutritionist_id INT NOT NULL,
    specialty_id INT NOT NULL,

    PRIMARY KEY ( nutritionist_id, specialty_id ),
    FOREIGN KEY ( nutritionist_id ) REFERENCES nutritionists( id ) ON DELETE CASCADE,
    FOREIGN KEY ( specialty_id ) REFERENCES specialties( id ) ON DELETE CASCADE
);

-- actividad
CREATE TABLE activities(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR( 100 ) NOT NULL UNIQUE
);

-- instructor_actividad
CREATE TABLE instructor_activities(
    instructor_id INT NOT NULL,
    activity_id INT NOT NULL,

    PRIMARY KEY ( instructor_id, activity_id ),
    FOREIGN KEY ( instructor_id ) REFERENCES instructors( id ) ON DELETE CASCADE,
    FOREIGN KEY ( activity_id ) REFERENCES activities( id ) ON DELETE CASCADE
);

-- documento_profesional
CREATE TABLE professional_documents(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    file_name VARCHAR( 255 ) NOT NULL,
    pdf_url VARCHAR( 500 ) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY ( user_id ) REFERENCES users( id ) ON DELETE CASCADE
);

-- disponibilidad_horaria
CREATE TABLE availability_schedules(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    day_of_week VARCHAR( 20 ) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    CHECK ( end_time > start_time ),
    FOREIGN KEY ( user_id ) REFERENCES users( id ) ON DELETE CASCADE
);

-- medicion_cliente
CREATE TABLE client_measurements(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id INT NOT NULL,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg NUMERIC( 5, 2 ) NOT NULL,

    CHECK ( weight_kg > 0 ),
    FOREIGN KEY ( client_id ) REFERENCES clients( id ) ON DELETE CASCADE
);

-- Carga inicial del catálogo de actividades
INSERT INTO activities ( name ) VALUES
    ( 'Spinning' ),
    ( 'Natación' ),
    ( 'Musculación' ),
    ( 'Funcional' ),
    ( 'Crossfit' ),
    ( 'Yoga' ),
    ( 'Pilates' )
ON CONFLICT ( name ) DO NOTHING;

CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    dias TEXT[] NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    instructor_id INTEGER NOT NULL REFERENCES instructors(id),
    estado VARCHAR(10) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rango_horario CHECK (hora_inicio < hora_fin)
);