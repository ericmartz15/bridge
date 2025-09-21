import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Initialize Supabase client with the CORRECT URL
const supabase = createClient(
  "https://bhzwyokvygnxnqdocjhy.supabase.co",  // Use the working URL from your other file
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoend5b2t2eWdueG5xZG9jamh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNTQ1MDYsImV4cCI6MjA3MzczMDUwNn0.vSyiiRvQNV9DOcZRUHH31YkNqC5KZHgo0IqZ0DBcpUE"
);

// Function to automatically determine current quarter
function getCurrentQuarter() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  if (month >= 1 && month <= 3) return `winter${year}`;
  if (month >= 4 && month <= 6) return `spring${year}`;
  if (month >= 7 && month < 9) return `summer${year}`;
  return `fall${year}`;
}

async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const file = formData.get("pdfUpload");

  console.log("File retrieved:", file);

  let fileUrl = null;
  if (file && file.name) {
    try {
      fileUrl = await handleFileUpload(file);
      console.log("File URL returned:", fileUrl);
    } catch (error) {
      console.error("File upload failed:", error);
      alert("File upload failed: " + error.message);
      return;
    }
  }

  // Prepare form values
  const formDataObj = Object.fromEntries(formData.entries());
  delete formDataObj.pdfUpload; // Remove the file object

  const currentQuarter = getCurrentQuarter();
  console.log(`Submitting form for quarter: ${currentQuarter}`);

  const formValues = {
    ...formDataObj,
    quarter: currentQuarter,
    pdfUpload: fileUrl,
  };

  try {
    const { data, error } = await supabase
      .from("staff_responses")
      .insert([formValues]);

    if (error) {
      throw error;
    }

    console.log("Form submitted successfully:", data);
    window.location.href =
      "https://web.stanford.edu/group/bridge/staffonly/thank-you.html";
  } catch (error) {
    console.error("Error occurred while submitting form:", error);
    alert("Form submission failed: " + error.message);
  }
}

async function handleFileUpload(file) {
  // Generate a unique filename and sanitize it
  const timestamp = new Date().getTime();
  const sanitizedFileName = file.name
    .replace(/[^\w\s.-]/g, '') // Remove special characters except word chars, spaces, dots, hyphens
    .replace(/\s+/g, '_')       // Replace spaces with underscores
    .replace(/_{2,}/g, '_');    // Replace multiple underscores with single underscore
  
  const fileName = `${timestamp}-${sanitizedFileName}`;
  const currentQuarter = getCurrentQuarter();
  
  // Use single bucket with quarter folders
  const filePath = `${currentQuarter}/${fileName}`;
  const bucketName = "staffer-agreements";

  console.log("File selected:", file.name);
  console.log("Uploading file to path:", filePath);
  console.log("Using bucket:", bucketName);

  try {
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Error uploading file:", error);
      throw error;
    }

    console.log("File upload successful, data returned:", data);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error("Failed to get public URL for uploaded file");
    }

    console.log("Public file URL:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("File upload process failed:", error);
    throw error;
  }
}

document.getElementById("myForm").addEventListener("submit", handleSubmit);