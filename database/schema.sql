-- ============================================================
-- BROKE BY 30
-- Snowflake Database
-- ============================================================

CREATE DATABASE IF NOT EXISTS BROKE_BY_30;

USE DATABASE BROKE_BY_30;

CREATE SCHEMA IF NOT EXISTS GAME;

USE SCHEMA GAME;


-- ============================================================
-- 1. FIRST NAMES
--
-- Used when randomly generating a new character.
-- ============================================================

CREATE TABLE IF NOT EXISTS FIRST_NAMES (
    name_id INTEGER AUTOINCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL
);


-- ============================================================
-- 2. CITIES
--
-- Different cities have different costs of living.
-- ============================================================

CREATE TABLE IF NOT EXISTS CITIES (
    city_id INTEGER AUTOINCREMENT PRIMARY KEY,

    city_name VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,

    cost_of_living_multiplier FLOAT DEFAULT 1.0,

    typical_rent NUMBER(10,2) DEFAULT 0
);


-- ============================================================
-- 3. OCCUPATIONS
--
-- Jobs available throughout the game.
-- ============================================================

CREATE TABLE IF NOT EXISTS OCCUPATIONS (
    occupation_id INTEGER AUTOINCREMENT PRIMARY KEY,

    title VARCHAR(150) NOT NULL,

    industry VARCHAR(100),

    annual_salary NUMBER(10,2) DEFAULT 0,

    education_requirement VARCHAR(100),

    minimum_age INTEGER DEFAULT 18
);


-- ============================================================
-- 4. STARTING BACKGROUNDS
--
-- Determines the financial situation a generated 18-year-old
-- starts with.
-- ============================================================

CREATE TABLE IF NOT EXISTS STARTING_BACKGROUNDS (
    background_id INTEGER AUTOINCREMENT PRIMARY KEY,

    background_name VARCHAR(150) NOT NULL,

    description VARCHAR(1000),

    savings_min NUMBER(10,2) DEFAULT 0,
    savings_max NUMBER(10,2) DEFAULT 0,

    cash_min NUMBER(10,2) DEFAULT 0,
    cash_max NUMBER(10,2) DEFAULT 0,

    monthly_expenses_min NUMBER(10,2) DEFAULT 0,
    monthly_expenses_max NUMBER(10,2) DEFAULT 0,

    starting_rent NUMBER(10,2) DEFAULT 0,

    living_situation VARCHAR(150)
);


-- ============================================================
-- 5. SCENARIOS
--
-- Life events that can appear during the game.
-- ============================================================

CREATE TABLE IF NOT EXISTS SCENARIOS (
    scenario_id INTEGER AUTOINCREMENT PRIMARY KEY,

    title VARCHAR(200) NOT NULL,

    description VARCHAR(2000) NOT NULL,

    min_age INTEGER NOT NULL,
    max_age INTEGER NOT NULL,

    category VARCHAR(50) NOT NULL,

    probability FLOAT DEFAULT 1.0,

    requires_car BOOLEAN DEFAULT FALSE,

    requires_college BOOLEAN DEFAULT FALSE,

    requires_credit_card BOOLEAN DEFAULT FALSE,

    requires_student_debt BOOLEAN DEFAULT FALSE,

    is_document_event BOOLEAN DEFAULT FALSE,

    active BOOLEAN DEFAULT TRUE
);


-- ============================================================
-- 6. CHOICES
--
-- Every scenario can have multiple choices.
--
-- Effects are stored here so the frontend does NOT determine
-- financial consequences.
-- ============================================================

CREATE TABLE IF NOT EXISTS CHOICES (
    choice_id INTEGER AUTOINCREMENT PRIMARY KEY,

    scenario_id INTEGER NOT NULL,

    choice_text VARCHAR(500) NOT NULL,

    result_text VARCHAR(2000),

    savings_change NUMBER(10,2) DEFAULT 0,

    cash_change NUMBER(10,2) DEFAULT 0,

    student_debt_change NUMBER(10,2) DEFAULT 0,

    credit_card_debt_change NUMBER(10,2) DEFAULT 0,

    car_debt_change NUMBER(10,2) DEFAULT 0,

    credit_score_change INTEGER DEFAULT 0,

    salary_change NUMBER(10,2) DEFAULT 0,

    monthly_rent_change NUMBER(10,2) DEFAULT 0,

    monthly_expenses_change NUMBER(10,2) DEFAULT 0,

    emergency_fund_change NUMBER(10,2) DEFAULT 0,

    experience_change INTEGER DEFAULT 0,

    sets_has_car BOOLEAN,

    sets_college_status VARCHAR(100),

    new_occupation_id INTEGER,

    FOREIGN KEY (scenario_id)
        REFERENCES SCENARIOS(scenario_id)
);


-- ============================================================
-- 7. PLAYERS
--
-- Every click of "New Life" creates a NEW player.
--
-- This is the generated character and their current game state.
-- ============================================================

CREATE TABLE IF NOT EXISTS PLAYERS (
    player_id INTEGER AUTOINCREMENT PRIMARY KEY,

    first_name VARCHAR(100) NOT NULL,

    age INTEGER DEFAULT 18,

    city_id INTEGER,

    background_id INTEGER,

    occupation_id INTEGER,

    annual_salary NUMBER(10,2) DEFAULT 0,

    savings NUMBER(10,2) DEFAULT 0,

    cash NUMBER(10,2) DEFAULT 0,

    student_debt NUMBER(10,2) DEFAULT 0,

    credit_card_debt NUMBER(10,2) DEFAULT 0,

    car_debt NUMBER(10,2) DEFAULT 0,

    credit_score INTEGER,

    emergency_fund NUMBER(10,2) DEFAULT 0,

    monthly_rent NUMBER(10,2) DEFAULT 0,

    monthly_expenses NUMBER(10,2) DEFAULT 0,

    has_car BOOLEAN DEFAULT FALSE,

    has_credit_card BOOLEAN DEFAULT FALSE,

    college_status VARCHAR(100) DEFAULT 'NONE',

    experiences INTEGER DEFAULT 0,

    xtract_tokens INTEGER DEFAULT 3,

    game_over BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);


-- ============================================================
-- 8. PLAYER HISTORY
--
-- Stores the BitLife-style timeline.
-- ============================================================

CREATE TABLE IF NOT EXISTS PLAYER_HISTORY (
    history_id INTEGER AUTOINCREMENT PRIMARY KEY,

    player_id INTEGER NOT NULL,

    age INTEGER NOT NULL,

    scenario_id INTEGER,

    choice_id INTEGER,

    title VARCHAR(500),

    result_text VARCHAR(2000),

    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    FOREIGN KEY (player_id)
        REFERENCES PLAYERS(player_id)
);


-- ============================================================
-- 9. DOCUMENTS
--
-- Synthetic financial documents used for Xtract events.
-- ============================================================

CREATE TABLE IF NOT EXISTS DOCUMENTS (
    document_id INTEGER AUTOINCREMENT PRIMARY KEY,

    scenario_id INTEGER,

    document_type VARCHAR(100),

    title VARCHAR(300),

    document_text VARCHAR(16000),

    difficulty INTEGER DEFAULT 1,

    FOREIGN KEY (scenario_id)
        REFERENCES SCENARIOS(scenario_id)
);



-- ============================================================
--                     STARTING DATA
-- ============================================================


-- ============================================================
-- NAMES
-- ============================================================

INSERT INTO FIRST_NAMES (first_name)
VALUES
    ('Jordan'),
    ('Maya'),
    ('Marcus'),
    ('Alex'),
    ('Taylor'),
    ('Sofia'),
    ('Noah'),
    ('Avery'),
    ('Cameron'),
    ('Zoe'),
    ('Ethan'),
    ('Olivia'),
    ('Jayden'),
    ('Mia'),
    ('Lucas'),
    ('Amara'),
    ('Daniel'),
    ('Nina'),
    ('Ryan'),
    ('Leah');


-- ============================================================
-- CITIES
-- ============================================================

INSERT INTO CITIES
(
    city_name,
    state,
    cost_of_living_multiplier,
    typical_rent
)
VALUES
    ('Pittsburgh', 'PA', 0.95, 1100),
    ('Cleveland', 'OH', 0.90, 1000),
    ('Chicago', 'IL', 1.15, 1500),
    ('Philadelphia', 'PA', 1.10, 1450),
    ('Charlotte', 'NC', 1.05, 1400),
    ('Dallas', 'TX', 1.05, 1450),
    ('Atlanta', 'GA', 1.08, 1500),
    ('New York', 'NY', 1.65, 2400);


-- ============================================================
-- OCCUPATIONS
-- ============================================================

INSERT INTO OCCUPATIONS
(
    title,
    industry,
    annual_salary,
    education_requirement,
    minimum_age
)
VALUES
    (
        'Unemployed',
        'None',
        0,
        'None',
        18
    ),

    (
        'Retail Associate',
        'Retail',
        18000,
        'High School',
        18
    ),

    (
        'Restaurant Crew Member',
        'Food Service',
        20000,
        'High School',
        18
    ),

    (
        'Barista',
        'Food Service',
        19000,
        'High School',
        18
    ),

    (
        'Grocery Associate',
        'Retail',
        21000,
        'High School',
        18
    ),

    (
        'Electrician Apprentice',
        'Trades',
        35000,
        'Trade School',
        18
    ),

    (
        'Electrician',
        'Trades',
        55000,
        'Trade School',
        21
    ),

    (
        'Junior Financial Analyst',
        'Finance',
        62000,
        'Bachelor''s Degree',
        22
    ),

    (
        'Software Engineer',
        'Technology',
        78000,
        'Bachelor''s Degree',
        22
    ),

    (
        'Registered Nurse',
        'Healthcare',
        70000,
        'Bachelor''s Degree',
        22
    ),

    (
        'Marketing Coordinator',
        'Marketing',
        52000,
        'Bachelor''s Degree',
        22
    ),

    (
        'Accountant',
        'Finance',
        60000,
        'Bachelor''s Degree',
        22
    );


-- ============================================================
-- STARTING BACKGROUNDS
--
-- These make characters financially different.
-- ============================================================

INSERT INTO STARTING_BACKGROUNDS
(
    background_name,
    description,

    savings_min,
    savings_max,

    cash_min,
    cash_max,

    monthly_expenses_min,
    monthly_expenses_max,

    starting_rent,

    living_situation
)
VALUES

(
    'Living With Family',
    'You recently graduated high school and are living at home while deciding what comes next.',

    1000,
    4500,

    100,
    800,

    150,
    450,

    0,

    'Living with family'
),

(
    'Independent Early',
    'You moved out shortly after high school and already have monthly living expenses.',

    300,
    2000,

    50,
    500,

    600,
    1000,

    700,

    'Sharing an apartment'
),

(
    'Strong Start',
    'You worked throughout high school and managed to build a decent amount of savings.',

    4000,
    8000,

    300,
    1200,

    200,
    500,

    0,

    'Living with family'
),

(
    'Starting From Scratch',
    'You are entering adulthood with very little saved and will need to build from the ground up.',

    0,
    700,

    20,
    250,

    250,
    600,

    0,

    'Living with family'
);


-- ============================================================
-- AGE 18 SCENARIO 1
-- EDUCATION / CAREER PATH
-- ============================================================

INSERT INTO SCENARIOS
(
    title,
    description,
    min_age,
    max_age,
    category,
    probability
)
VALUES
(
    'What''s Next?',
    'High school is over. Everyone keeps asking what you are doing next. Now you actually have to decide.',
    18,
    18,
    'EDUCATION',
    1.0
);


INSERT INTO CHOICES
(
    scenario_id,
    choice_text,
    result_text,

    savings_change,
    student_debt_change,

    sets_college_status
)
VALUES

(
    1,

    'Go to a four-year college',

    'You enrolled at a four-year university. College life has officially begun.',

    -1000,

    12000,

    'FOUR_YEAR'
),

(
    1,

    'Start at community college',

    'You chose community college and kept your education costs significantly lower.',

    -500,

    2500,

    'COMMUNITY_COLLEGE'
),

(
    1,

    'Go to trade school',

    'You enrolled in trade school and began learning a skilled trade.',

    -1000,

    5000,

    'TRADE_SCHOOL'
),

(
    1,

    'Start working',

    'You entered the workforce immediately and started earning money.',

    1000,

    0,

    'NONE'
);


-- ============================================================
-- AGE 18-20 SCENARIO 2
-- FIRST CREDIT CARD
-- ============================================================

INSERT INTO SCENARIOS
(
    title,
    description,
    min_age,
    max_age,
    category,
    probability
)
VALUES
(
    'Your First Credit Card?',
    'You receive an offer for your first credit card. The shiny envelope promises rewards and cash back.',
    18,
    20,
    'CREDIT',
    0.60
);


INSERT INTO CHOICES
(
    scenario_id,
    choice_text,
    result_text,
    credit_score_change
)
VALUES

(
    2,

    'Open the card',

    'You opened your first credit card. Welcome to the world of credit.',

    5
),

(
    2,

    'Ignore the offer',

    'You threw the offer away and decided credit could wait.',

    0
);


-- ============================================================
-- AGE 18-22 SCENARIO 3
-- CONCERT
-- ============================================================

INSERT INTO SCENARIOS
(
    title,
    description,
    min_age,
    max_age,
    category,
    probability
)
VALUES
(
    'Front Row?',
    'Your favorite artist is coming to town. Your friends found tickets, but your share will cost $320.',
    18,
    22,
    'SOCIAL',
    0.50
);


INSERT INTO CHOICES
(
    scenario_id,
    choice_text,
    result_text,

    savings_change,
    credit_card_debt_change,

    experience_change
)
VALUES

(
    3,

    'Buy the ticket with savings',

    'The concert was incredible. Your savings account is $320 lighter.',

    -320,

    0,

    1
),

(
    3,

    'Put it on your credit card',

    'You had an amazing night, but the concert followed you home as credit card debt.',

    0,

    320,

    1
),

(
    3,

    'Skip it',

    'You kept your money, but your friends will definitely be posting videos all night.',

    0,

    0,

    0
);


-- ============================================================
-- AGE 19-24 SCENARIO 4
-- PHONE BREAKS
-- ============================================================

INSERT INTO SCENARIOS
(
    title,
    description,
    min_age,
    max_age,
    category,
    probability
)
VALUES
(
    'Your Phone Just Died',
    'Your phone has officially given up. You need to decide how much replacing it is worth.',
    19,
    24,
    'EMERGENCY',
    0.35
);


INSERT INTO CHOICES
(
    scenario_id,
    choice_text,
    result_text,

    savings_change,
    credit_card_debt_change
)
VALUES

(
    4,

    'Buy a $1,000 flagship phone',

    'You bought the newest phone. Your wallet is less impressed than you are.',

    -1000,

    0
),

(
    4,

    'Buy a $400 budget phone',

    'It is not flashy, but it works perfectly well.',

    -400,

    0
),

(
    4,

    'Finance the expensive phone',

    'You got the phone immediately, but added another payment to your life.',

    0,

    1000
);


-- ============================================================
-- AGE 20-25 SCENARIO 5
-- MIAMI TRIP
-- ============================================================

INSERT INTO SCENARIOS
(
    title,
    description,
    min_age,
    max_age,
    category,
    probability
)
VALUES
(
    'Miami?',
    'Your friends are planning a weekend in Miami. Your share of the trip will cost about $850.',
    20,
    25,
    'SOCIAL',
    0.40
);


INSERT INTO CHOICES
(
    scenario_id,
    choice_text,
    result_text,

    savings_change,
    credit_card_debt_change,

    experience_change
)
VALUES

(
    5,

    'Pay $850 from savings',

    'Miami was incredible. You paid for the entire trip with money you already had.',

    -850,

    0,

    1
),

(
    5,

    'Put $850 on your credit card',

    'Miami was incredible. Unfortunately, the $850 bill came home with you.',

    0,

    850,

    1
),

(
    5,

    'Stay home',

    'You skipped the trip and kept the $850.',

    0,

    0,

    0
);


-- ============================================================
-- AGE 21-26 SCENARIO 6
-- APARTMENT
-- DOCUMENT / XTRACT EVENT
-- ============================================================

INSERT INTO SCENARIOS
(
    title,
    description,

    min_age,
    max_age,

    category,

    probability,

    is_document_event
)
VALUES
(
    'Your First Apartment',

    'You found an apartment that looks affordable, but the lease contains more than just the advertised rent.',

    21,
    26,

    'HOUSING',

    0.45,

    TRUE
);


INSERT INTO CHOICES
(
    scenario_id,
    choice_text,
    result_text,

    savings_change,

    monthly_rent_change,
    monthly_expenses_change
)
VALUES

(
    6,

    'Sign the lease',

    'You signed the lease and officially moved into your own place.',

    -1500,

    1450,

    225
),

(
    6,

    'Keep looking',

    'You decided the true cost of the apartment was higher than you were comfortable paying.',

    0,

    0,

    0
);


-- ============================================================
-- SYNTHETIC APARTMENT LEASE
-- FOR XTRACT
-- ============================================================

INSERT INTO DOCUMENTS
(
    scenario_id,

    document_type,

    title,

    document_text,

    difficulty
)
VALUES
(
    6,

    'APARTMENT_LEASE',

    'Oakwood Apartments Residential Lease',

    '
RESIDENTIAL LEASE AGREEMENT

SECTION 1 - MONTHLY RENT

Tenant agrees to pay monthly base rent of $1,450.

SECTION 2 - PARKING

Residents utilizing the property parking facility shall pay
an additional mandatory parking fee of $150 per month.

SECTION 3 - AMENITIES

Tenant shall be charged a monthly amenity fee of $75.

SECTION 4 - LATE PAYMENT

Rent received more than five days after the due date may
result in a late payment charge of $75.

SECTION 5 - EARLY TERMINATION

Early termination of this lease requires payment equivalent
to two months of base rent.

SECTION 6 - SECURITY DEPOSIT

A security deposit of $1,450 is due prior to move-in.
',

    1
);


-- ============================================================
-- AGE 22-27 SCENARIO 7
-- JOB OFFER
-- ============================================================

INSERT INTO SCENARIOS
(
    title,
    description,

    min_age,
    max_age,

    category,

    probability
)
VALUES
(
    'A Better Offer?',

    'Another company offers you a position paying $12,000 more per year, but taking it requires relocating.',

    22,
    27,

    'CAREER',

    0.40
);


INSERT INTO CHOICES
(
    scenario_id,

    choice_text,

    result_text,

    savings_change,

    salary_change
)
VALUES

(
    7,

    'Take the new job',

    'You packed your bags, paid the moving costs, and started the higher-paying job.',

    -2000,

    12000
),

(
    7,

    'Stay where you are',

    'You decided stability mattered more than the salary increase right now.',

    0,

    0
);


-- ============================================================
-- AGE 23-30 SCENARIO 8
-- CAR REPAIR
-- ============================================================

INSERT INTO SCENARIOS
(
    title,
    description,

    min_age,
    max_age,

    category,

    probability,

    requires_car
)
VALUES
(
    'That Sound Wasn''t Good',

    'Your car needs an unexpected $1,350 repair.',

    23,
    30,

    'EMERGENCY',

    0.30,

    TRUE
);


INSERT INTO CHOICES
(
    scenario_id,

    choice_text,

    result_text,

    savings_change,

    credit_card_debt_change,

    credit_score_change
)
VALUES
