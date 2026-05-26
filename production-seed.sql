--
-- PostgreSQL database dump
--

\restrict Ba0FekIKqXoOd2UeamcYfsqfHXVxvuwzylnOLyWxMbuT7tDdacxaIR5LOssaiom

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: account_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.account_transactions (id, "accountId", type, category, amount, "referenceId", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounts (id, "stationId", name, type, balance, currency, "isActive", "createdAt") FROM stdin;
fb26cb3e-4b7c-40cc-acb7-cbf417f56258	e902e5ee-0c2d-490c-8802-a2ba3c008262	الخزنة	safe	42229.33	SAR	t	2026-05-25 16:57:38.581491
2413af70-9bf6-4b60-91e3-c443908c1037	e902e5ee-0c2d-490c-8802-a2ba3c008262	البنك	bank	25809.88	SAR	t	2026-05-25 16:57:38.582899
\.


--
-- Data for Name: cash_collections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_collections (id, "shiftId", "stationId", "accountantId", "toAccountId", "amountExpected", "amountReceived", discrepancy, notes, "collectedAt", "bankAccountId", "creditAccountId", "cardAmount", "creditAmount") FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, "stationId", "accountId", category, description, amount, "paidAt", "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchases (id, "stationId", "tankId", "supplierName", "invoiceNumber", liters, "pricePerLiter", "totalCost", "deliveredAt", "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales (id, "stationId", "shiftId", "tankId", "employeeId", liters, "pricePerLiter", "totalAmount", "paymentMethod", "createdAt") FROM stdin;
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shifts (id, "stationId", "employeeId", "startedAt", "closedAt", "openingCash", "expectedCash", "actualCash", discrepancy, "totalLitersSold", "totalRevenue", status, "createdAt", "updatedAt", "cashRevenue", "cardRevenue", "creditRevenue") FROM stdin;
\.


--
-- Data for Name: stations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stations (id, name, address, phone, "isActive", "createdAt") FROM stdin;
e902e5ee-0c2d-490c-8802-a2ba3c008262	محطة الوقود		\N	t	2026-05-25 16:57:38.575649
\.


--
-- Data for Name: tanks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tanks (id, "stationId", name, "fuelType", "capacityLiters", "currentLevelLiters", "lowLevelThreshold", "isActive", "createdAt", "updatedAt", "currentPrice") FROM stdin;
e52e473f-e68e-4d3e-88c8-a85ea4be7924	e902e5ee-0c2d-490c-8802-a2ba3c008262	خزان البنزين 91	petrol_91	40000.00	5652.00	2000.00	t	2026-05-25 16:57:38.579546	2026-05-25 16:57:38.579546	2.2000
\.


--
-- Data for Name: transfers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transfers (id, "stationId", "fromAccountId", "toAccountId", amount, notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password, pin, role, "pinFailedAttempts", "pinLocked", "stationId", "isActive", "refreshToken", "createdAt", "updatedAt") FROM stdin;
4a50fdfd-f961-4092-979c-ec4cfd93ba75	Salah	salah@station.local	\N	$2b$10$pWweX5qFVCNWjfp83E5Kuuv3Fy7GJKoqVLkT7wvO6yzOi0oNvZnCe	employee	0	f	e902e5ee-0c2d-490c-8802-a2ba3c008262	t	\N	2026-05-25 16:42:58.988758	2026-05-25 16:42:58.988758
54d7a3be-99da-4666-9036-d13afbd0e660	Owner	owner@fuel.com	$2b$10$IcbvHe.T4vATLd3.1zTZrOvo4y9l8ceZSePHhY3XoXFG4.gPgEO1W	\N	owner	0	f	e902e5ee-0c2d-490c-8802-a2ba3c008262	t	$2b$10$8vtYktHDKe7NvQUWL8LRwOkfyokPooGa1oBZqobkUeLx7phYJvlVq	2026-05-22 18:14:42.158128	2026-05-25 16:44:38.328989
\.


--
-- PostgreSQL database dump complete
--

\unrestrict Ba0FekIKqXoOd2UeamcYfsqfHXVxvuwzylnOLyWxMbuT7tDdacxaIR5LOssaiom

