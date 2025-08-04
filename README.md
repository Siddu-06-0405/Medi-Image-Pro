# Medi-Image-Pro

Medi-Image-Pro is a full-stack radiography image platform for handling DICOM file uploads, segmentation, and web-based rendering—designed with OHIF Viewer integration in mind. It supports both standalone DICOM files and DICOMweb API calls, enabling seamless rendering and interaction with `.dcm` images on the frontend.

---

## 🚀 Tech Stack

### 🧠 Backend

* **FastAPI** (Python)
* **pydicom**
* **DICOMweb-compatible APIs**
* **CORS Middleware**
* **StreamingResponse** for DICOM instance access

### 🎨 Frontend

* **React** + **TypeScript**
* **Vite** for bundling
* **TailwindCSS** + **ShadCN/UI**
* **Radix UI components**
* **cornerstone.js**, **dcmjs**, **dicom-parser** for DICOM viewing
* **React Router**, **React Query**, **Zod**, **Lucide Icons**

---

## 🛠️ Installation

1. **Clone the repository**

```bash
git clone https://github.com/Siddu-06-0405/Medi-Image-Pro.git
cd Medi-Image-Pro
```

2. **Install Python dependencies (Terminal-1)**

```bash
pip install -r requirements.txt
```

3. **Install frontend dependencies (Terminal-2)**

```bash
cd nifty-nii
npm install
```

---

## ▶️ Running the App

### 📱 Backend (Terminal-1)

```bash
cd backend/
uvicorn main:app --port 9999
```

### 🖼 Frontend (Terminal-2)

```bash
npm run dev
```

Now open [http://localhost:8080](http://localhost:8080) to view the web app.

---

## 📦 API Overview

The backend exposes a complete **DICOMweb-compatible API**, designed for integration with the **OHIF Viewer**.

* `GET /studies` – Fetch all study metadata
* `GET /studies/{study_uid}/series` – Fetch series for a study
* `GET /studies/{study_uid}/series/{series_uid}/instances` – Fetch DICOM instances
* `GET /studies/{study_uid}/series/{series_uid}/metadata` – Instance-level metadata
* `POST /upload` – Upload image and segmentation mask
* `GET /dicomweb/studies/.../frames/1` – Return raw pixel data for OHIF

> OHIF Viewer's compatibility was carefully considered during API design.
> Contribution toward enhancing `.dcm` rendering and metadata visualization in OHIF is **highly encouraged**.

---

## Contributing

Pull requests are welcome!
If you're interested in contributing:

* Focus on DICOM rendering and visualization in OHIF
* Try implementing additional DICOM tags support
* Extend metadata handling or 3D viewer support

Before submitting, please:

* Run `npm run lint` on the frontend
* Follow clean code practices and consistent formatting

---

## 👤 Author

**Siddardha Chaitanya**

* 💻 GitHub: [@Siddu-06-0405](https://github.com/Siddu-06-0405)
* 💼 LinkedIn: [@siddardha-chaitanya](https://www.linkedin.com/in/siddardha-chaitanya-5a804b298/)
* 📧 Email: [csiddhardha0@gmail.com](mailto:csiddhardha0@gmail.com)

---

## 📟 License

This project is open-source and available under the [MIT License](LICENSE).
