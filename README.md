# Baserow ERD Viewer

A web application to visualize Baserow tables as Entity-Relationship Diagrams (ERD). This tool helps you understand and visualize the structure of your Baserow database by displaying tables, fields, and relationships in an interactive diagram.

## Features

- Interactive ERD visualization
- Table structure display with field types
- Relationship visualization between tables
- Primary and foreign key indicators
- Drag and drop interface
- Zoom and pan controls
- Toggle between diagram and list views

## Tech Stack

- Frontend:
  - Next.js 14
  - React Flow for diagram visualization
  - Tailwind CSS for styling
  - TypeScript for type safety

- Backend:
  - FastAPI (Python)
  - Baserow API integration

## Prerequisites

- Python 3.8+
- Node.js 18+
- Baserow account and API token

## Setup

1. Clone the repository:
```bash
git clone https://github.com/frodoslav/baserow-erd-viewer.git
cd baserow-erd-viewer
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory:
```env
BASEROW_API_URL=https://api.baserow.io/api
BASEROW_EMAIL=your-email@example.com
BASEROW_PASSWORD=your-password
```

4. Set up the frontend:
```bash
cd frontend
npm install
```

5. Start the development servers:

Backend:
```bash
cd backend
python main.py
```

Frontend:
```bash
cd frontend
npm run dev
```

6. Open http://localhost:3000 in your browser

## Usage

1. Enter your Baserow credentials in the backend `.env` file
2. Start both backend and frontend servers
3. Access the web interface at http://localhost:3000
4. View your database structure in either diagram or list view
5. Drag tables to rearrange them in the diagram view
6. Use mouse wheel or pinch gestures to zoom in/out
7. Click and drag the background to pan the view

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.