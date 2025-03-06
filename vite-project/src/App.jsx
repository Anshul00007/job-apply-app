import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [newJob, setNewJob] = useState({ title: "", description: "" });
  const [authType, setAuthType] = useState("candidate");
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    fetch("http://localhost:5000/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
        fetchData(data.role);
      })
      .catch(() => localStorage.clear());
  }, []);

  const fetchData = (role = "candidate") => {
    fetch("http://localhost:5000/jobs").then(res => res.json()).then(setJobs);
    if (role === "candidate") fetch("http://localhost:5000/applications", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(res => res.json()).then(setApplications);
  };

  const handleAuth = async (e, isLogin) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/${isLogin ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogin ? authForm : { ...authForm, role: authType })
      });
      
      if (!res.ok) throw new Error(await res.json().then(data => data.error));
      
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      fetchData(data.user.role);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApply = async (jobId) => {
    if (!resumeFile) return alert("Upload resume");
    
    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("jobId", jobId);

    fetch("http://localhost:5000/apply", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: formData
    }).then(res => res.ok ? (fetchData(user.role), setResumeFile(null), alert("Applied")) : alert("Failed"));
  };

  const handleJobPost = () => {
    fetch("http://localhost:5000/add-job", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify(newJob)
    }).then(res => res.ok ? (fetchData(user.role), setNewJob({ title: "", description: "" })) : alert("Failed"));
  };

  const handleJobAction = (jobId, method) => {
    fetch(`http://localhost:5000/${method}-job/${jobId}`, {
      method: method === "update" ? "PUT" : "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: method === "update" ? JSON.stringify(newJob) : null
    }).then(res => res.ok ? fetchData(user.role) : alert("Failed"));
  };

  const handleStatusUpdate = (applicationId, status) => {
    fetch(`http://localhost:5000/update-status/${applicationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ status })
    }).then(res => res.ok ? fetchData(user.role) : alert("Failed"));
  };

  const fetchApplications = (jobId) => {
    fetch(`http://localhost:5000/applications/${jobId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(res => res.json())
      .then(setApplications);
  };

  const logout = () => {
    fetch("http://localhost:5000/logout", { method: "POST" }).finally(() => {
      setUser(null);
      localStorage.clear();
    });
  };

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex gap-4 mb-8">
          <button onClick={() => setAuthType("candidate")} className={`flex-1 p-2 rounded-xl ${authType === "candidate" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Candidate</button>
          <button onClick={() => setAuthType("recruiter")} className={`flex-1 p-2 rounded-xl ${authType === "recruiter" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Recruiter</button>
        </div>

        <form onSubmit={(e) => handleAuth(e, false)} className="space-y-6">
          {authType === "recruiter" && <input type="text" placeholder="Full Name" className="w-full p-3 border-2 border-gray-200 rounded-xl" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />}
          <input type="email" placeholder="Email" className="w-full p-3 border-2 border-gray-200 rounded-xl" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
          <input type="password" placeholder="Password" className="w-full p-3 border-2 border-gray-200 rounded-xl" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
          <button className="w-full bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700">{authType === "candidate" ? "Sign Up" : "Create Account"}</button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={(e) => handleAuth(e, true)} className="text-blue-600 hover:underline">Existing user? Login</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="bg-white w-64 min-h-screen shadow-lg p-4 flex flex-col">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
          <p className="text-gray-600">{user.role}</p>
        </div>

        {user.role === "candidate" ? (
          <>
            <button onClick={() => setView("jobs")} className={`p-3 text-left rounded-lg mb-2 ${view === "jobs" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}>🗂 Jobs</button>
            <button onClick={() => setView("applications")} className={`p-3 text-left rounded-lg ${view === "applications" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}>📑 Applications</button>
          </>
        ) : (
          <>
            <button onClick={() => setView("manage-jobs")} className={`p-3 text-left rounded-lg mb-2 ${view === "manage-jobs" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}>📋 Manage Jobs</button>
            <button onClick={() => setView("applicants")} className={`p-3 text-left rounded-lg ${view === "applicants" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}>👥 Applicants</button>
          </>
        )}
        <button onClick={logout} className="mt-auto p-3 text-left rounded-lg hover:bg-red-100 text-red-600">🚪 Logout</button>
      </div>

      <div className="flex-1 p-8">
        {user.role === "candidate" ? (
          view === "jobs" ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Jobs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobs.map(job => (
                  <div key={job._id} className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                    <p className="text-gray-600 mb-4">{job.description}</p>
                    <input type="file" className="mb-4" onChange={e => setResumeFile(e.target.files[0])} />
                    <button onClick={() => handleApply(job._id)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Apply</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Applications</h2>
              <div className="bg-white rounded-xl shadow-sm">
                {applications.map(app => (
                  <div key={app._id} className="p-6 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{app.jobTitle}</h3>
                        <p className="text-gray-600">{new Date(app.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-4 py-1 rounded-full ${app.status === "Accepted" ? "bg-green-100 text-green-800" : app.status === "Rejected" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : view === "manage-jobs" ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
              <input type="text" placeholder="Job Title" className="w-full p-3 mb-4 border rounded-lg" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} />
              <textarea placeholder="Description" className="w-full p-3 mb-4 border rounded-lg h-32" value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} />
              <button onClick={handleJobPost} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">Post Job</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map(job => (
                <div key={job._id} className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                  <p className="text-gray-600 mb-4">{job.description}</p>
                  <div className="flex space-x-4">
                    <button onClick={() => handleJobAction(job._id, "update")} className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700">Edit</button>
                    <button onClick={() => handleJobAction(job._id, "delete")} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map(job => (
                <div key={job._id} className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                  <p className="text-gray-600 mb-4">{job.description}</p>
                  <button onClick={() => fetchApplications(job._id)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">View Applicants</button>
                </div>
              ))}
            </div>

            {applications.length > 0 && (
              <div className="mt-8 bg-white rounded-xl shadow-sm">
                <h2 className="text-2xl font-bold p-6 border-b">Applications for {applications[0].jobTitle}</h2>
                {applications.map(app => (
                  <div key={app._id} className="p-6 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{app.candidate}</h3>
                        <a href={`http://localhost:5000/resume/${app.resume}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View Resume</a>
                      </div>
                      <div className="flex space-x-4">
                        <button onClick={() => handleStatusUpdate(app._id, "Accepted")} disabled={app.status !== "Pending"} className={`px-4 py-2 rounded-lg ${app.status === "Pending" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-200 cursor-default"}`}>
                          {app.status === "Accepted" ? "✓ Accepted" : "Accept"}
                        </button>
                        <button onClick={() => handleStatusUpdate(app._id, "Rejected")} disabled={app.status !== "Pending"} className={`px-4 py-2 rounded-lg ${app.status === "Pending" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-200 cursor-default"}`}>
                          {app.status === "Rejected" ? "✗ Rejected" : "Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;