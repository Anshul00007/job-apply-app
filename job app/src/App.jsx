import { useState, useEffect } from "react";
import { MoonIcon, SunIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ArrowRightIcon, BriefcaseIcon, DocumentTextIcon, UserCircleIcon, XCircleIcon, CheckCircleIcon, Bars3Icon } from "@heroicons/react/24/outline";
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
  const [isLogin, setIsLogin] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errors, setErrors] = useState({});

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
    if (role === "candidate") {
      fetch("http://localhost:5000/my-applications", { 
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
      })
      .then(res => res.json())
      .then(setApplications);
    }
  };

  const validateAuth = () => {
    const newErrors = {};
    if (!authForm.email.match(/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/)) {
      newErrors.email = "Invalid email address";
    }
    if (authForm.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!isLogin && authType === "recruiter" && !authForm.name.trim()) {
      newErrors.name = "Name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e, isLogin) => {
    e.preventDefault();
    if (!validateAuth()) return;
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

    try {
      const response = await fetch("http://localhost:5000/apply", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      
      fetchData(user.role);
      setResumeFile(null);
      alert("Applied successfully!");
    } catch (err) {
      alert(`Application failed: ${err.message}`);
    }
  };

  const handleJobPost = () => {
    fetch("http://localhost:5000/add-job", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify(newJob)
    }).then(res => res.ok ? (fetchData(user.role), setNewJob({ title: "", description: "" })) : alert("Failed"));
  };

  const handleJobAction = (jobId, method) => {
    const requestBody = method === "update" ? editingJob : null;
    
    fetch(`http://localhost:5000/${method}-job/${jobId}`, {
      method: method === "update" ? "PUT" : "DELETE",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}` 
      },
      body: method === "update" ? JSON.stringify(requestBody) : null
    })
    .then(res => {
      if (res.ok) {
        fetchData(user.role);
        setEditingJob(null);
      } else {
        res.json().then(err => alert(err.error));
      }
    })
    .catch(err => alert("Failed to update job"));
  };

  const handleStatusUpdate = (applicationId, status) => {
    fetch(`http://localhost:5000/update-status/${applicationId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${localStorage.getItem("token")}` 
      },
      body: JSON.stringify({ status })
    })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(updatedApp => {
      setApplications(prev => prev.map(app => 
        app._id === updatedApp._id ? updatedApp : app
      ));
      if (user.role === "recruiter") {
        fetchApplications(applications[0]?.jobId);
      }
    })
    .catch(() => alert("Failed to update status"));
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const Sidebar = () => (
    <div className={`fixed md:relative z-50 md:z-auto w-64 min-h-screen transform ${
      isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    } transition-transform duration-300 ease-in-out bg-white shadow-xl p-6 flex flex-col border-r ${
      darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200'
    }`}>
      <div className="mb-8">
        <h2 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-gray-800'}`}>
          <UserCircleIcon className="w-6 h-6 text-blue-600" />
          {user.name}
        </h2>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </p>
      </div>

      {user.role === "candidate" ? (
        <>
          <button 
            onClick={() => setView("jobs")} 
            className={`p-3 text-left rounded-lg mb-2 flex items-center gap-2 transition-colors ${
              view === "jobs" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
            }`}
          >
            <BriefcaseIcon className="w-5 h-5" />
            Jobs
          </button>
          <button 
            onClick={() => setView("applications")} 
            className={`p-3 text-left rounded-lg flex items-center gap-2 transition-colors ${
              view === "applications" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
            }`}
          >
            <DocumentTextIcon className="w-5 h-5" />
            Applications
          </button>
        </>
      ) : (
        <>
          <button 
            onClick={() => setView("manage-jobs")} 
            className={`p-3 text-left rounded-lg mb-2 flex items-center gap-2 transition-colors ${
              view === "manage-jobs" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
            }`}
          >
            <BriefcaseIcon className="w-5 h-5" />
            Manage Jobs
          </button>
          <button 
            onClick={() => setView("applicants")} 
            className={`p-3 text-left rounded-lg flex items-center gap-2 transition-colors ${
              view === "applicants" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
            }`}
          >
            <UserCircleIcon className="w-5 h-5" />
            Applicants
          </button>
        </>
      )}
      <button 
        onClick={logout} 
        className="mt-auto p-3 text-left rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
      >
        <ArrowRightIcon className="w-5 h-5" />
        Logout
      </button>
      <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute top-4 right-4 p-2">
        <XMarkIcon className="w-6 h-6 text-gray-600" />
      </button>
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-900 to-cyan-900'}`}>
      <nav className={`fixed w-full top-0 z-50 ${darkMode ? 'bg-gray-800' : 'bg-white/10'} backdrop-blur-lg border-b ${darkMode ? 'border-gray-700' : 'border-white/20'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-white'}`}>
                Anshul's CareerHub
              </h1>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg ${darkMode ? 'text-cyan-400 hover:bg-gray-700' : 'text-white hover:bg-white/10'}`}
            >
              {darkMode ? (
                <SunIcon className="h-6 w-6" />
              ) : (
                <MoonIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      <div className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className={`w-full max-w-md p-8 rounded-3xl shadow-xl transition-all duration-300 ${
          darkMode 
            ? 'bg-gray-800/90 backdrop-blur-lg' 
            : 'bg-white/10 backdrop-blur-md'
        }`}>
          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => setAuthType("candidate")} 
              className={`flex-1 p-3 rounded-xl transition-all ${
                authType === "candidate" 
                  ? `${darkMode ? 'bg-cyan-600 text-white' : 'bg-white/20 text-white'}` 
                  : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white/5 text-white/70'}`
              }`}
            >
              Candidate
            </button>
            <button 
              onClick={() => setAuthType("recruiter")} 
              className={`flex-1 p-3 rounded-xl transition-all ${
                authType === "recruiter" 
                  ? `${darkMode ? 'bg-cyan-600 text-white' : 'bg-white/20 text-white'}` 
                  : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white/5 text-white/70'}`
              }`}
            >
              Recruiter
            </button>
          </div>

          <form onSubmit={(e) => handleAuth(e, isLogin)} className="space-y-6">
            {!isLogin && authType === "recruiter" && (
              <div>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  className={`w-full p-3 rounded-xl transition-all ${
                    darkMode 
                      ? 'bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500' 
                      : 'bg-white/20 text-white focus:ring-2 focus:ring-white'
                  } placeholder-gray-400 border-none outline-none ${errors.name ? 'border-red-500' : ''}`}
                  value={authForm.name} 
                  onChange={e => setAuthForm({ ...authForm, name: e.target.value })} 
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
            )}
            
            <div>
              <input 
                type="email" 
                placeholder="Email" 
                className={`w-full p-3 rounded-xl transition-all ${
                  darkMode 
                    ? 'bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500' 
                    : 'bg-white/20 text-white focus:ring-2 focus:ring-white'
                } placeholder-gray-400 border-none outline-none ${errors.email ? 'border-red-500' : ''}`}
                value={authForm.email} 
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })} 
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <input 
                type="password" 
                placeholder="Password" 
                className={`w-full p-3 rounded-xl transition-all ${
                  darkMode 
                    ? 'bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500' 
                    : 'bg-white/20 text-white focus:ring-2 focus:ring-white'
                } placeholder-gray-400 border-none outline-none ${errors.password ? 'border-red-500' : ''}`}
                value={authForm.password} 
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })} 
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
            
            <button className={`w-full p-3 rounded-xl font-semibold transition-all ${
              darkMode 
                ? 'bg-cyan-600 text-white hover:bg-cyan-700' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}>
              {isLogin ? "Login" : authType === "candidate" ? "Sign Up" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { 
                setAuthForm({ email: "", password: "", name: "" }); 
                setIsLogin(!isLogin);
              }} 
              className={`text-sm ${
                darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-white/80 hover:text-white'
              }`}
            >
              {isLogin ? "New user? Sign Up" : "Existing user? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex`}>
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1">
        {/* Mobile Header */}
        <nav className={`md:hidden fixed w-full top-0 z-40 ${
          darkMode ? 'bg-gray-800/90' : 'bg-white/90'
        } backdrop-blur-lg border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2">
              <Bars3Icon className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
            </button>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg ${darkMode ? 'text-cyan-400 hover:bg-gray-700' : 'text-white hover:bg-white/10'}`}
            >
              {darkMode ? (
                <SunIcon className="h-6 w-6" />
              ) : (
                <MoonIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </nav>

        {/* Desktop Header */}
        <nav className={`hidden md:block fixed w-full top-0 z-40 ${
          darkMode ? 'bg-gray-800/90' : 'bg-white/90'
        } backdrop-blur-lg border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex-shrink-0">
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-gray-800'}`}>
                  Anshul's CareerHub
                </h1>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg ${darkMode ? 'text-cyan-400 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-200'}`}
              >
                {darkMode ? (
                  <SunIcon className="h-6 w-6" />
                ) : (
                  <MoonIcon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </nav>

        <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
          {editingJob && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-xl w-96">
                <h2 className="text-xl font-bold mb-4">Edit Job</h2>
                <input
                  value={editingJob.title}
                  onChange={(e) => setEditingJob({...editingJob, title: e.target.value})}
                  className="w-full mb-4 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Job Title"
                />
                <textarea
                  value={editingJob.description}
                  onChange={(e) => setEditingJob({...editingJob, description: e.target.value})}
                  className="w-full mb-4 p-2 border rounded h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleJobAction(editingJob._id, "update")}
                    className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingJob(null)}
                    className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {user.role === "candidate" ? (
            view === "jobs" ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Jobs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {jobs.map(job => (
                    <div key={job._id} className={`p-6 rounded-xl shadow-lg transition-transform hover:scale-105 ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                      <p className="text-gray-600 mb-4">{job.description}</p>
                      <div className="space-y-4">
                        <input 
                          type="file"
                          name="resume"  // Add name attribute
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          onChange={e => setResumeFile(e.target.files[0])} 
                          accept=".pdf,.txt"  // Add accept attribute
                        />
                        <button 
                          onClick={() => handleApply(job._id)} 
                          disabled={applications.some(a => a.jobId === job._id)}
                          className={`w-full text-sm font-medium px-6 py-2 rounded-lg transition-colors ${
                            applications.some(a => a.jobId === job._id)
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {applications.some(a => a.jobId === job._id) ? "Applied ✓" : "Apply Now"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Applications</h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  {applications.length === 0 ? (
                    <div className="p-6 text-gray-500">No applications found</div>
                  ) : (
                    applications.map(app => (
                      <div key={app._id} className="p-6 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{app.jobTitle}</h3>
                            <p className="text-gray-600 text-sm">
                              Applied on {new Date(app.date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-4 py-1 rounded-full text-sm ${
                            app.status === "Accepted" 
                              ? "bg-green-100 text-green-800"
                              : app.status === "Rejected" 
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {app.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          ) : view === "manage-jobs" ? (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-xl font-bold mb-4">Post New Job</h2>
                <input
                  type="text"
                  placeholder="Job Title"
                  className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newJob.title}
                  onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                />
                <textarea
                  placeholder="Description"
                  className="w-full p-3 mb-4 border rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newJob.description}
                  onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                />
                <button 
                  onClick={handleJobPost}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Post Job
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobs.map(job => (
                  <div key={job._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                    <p className="text-gray-600 mb-4">{job.description}</p>
                    <div className="flex space-x-4">
                      <button 
                        onClick={() => setEditingJob(job)}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleJobAction(job._id, "delete")}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobs.map(job => (
                  <div key={job._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                    <p className="text-gray-600 mb-4">{job.description}</p>
                    <button 
                      onClick={() => fetchApplications(job._id)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Applicants
                    </button>
                  </div>
                ))}
              </div>

              {applications.length > 0 && (
                <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-bold p-6 border-b">
                    Applications for {applications[0].jobTitle}
                  </h2>
                  {applications.map(app => (
                    <div key={app._id} className="p-6 border-b last:border-b-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{app.candidate}</h3>
                          <a 
                            href={`http://localhost:5000/resume/${app.resume}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View Resume
                          </a>
                        </div>
                        <div className="flex space-x-4 items-center">
                          <button 
                            onClick={() => handleStatusUpdate(app._id, "Accepted")}
                            disabled={app.status !== "Pending"}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              app.status === "Accepted" 
                                ? "bg-green-500 text-white cursor-default"
                                : app.status === "Pending"
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            {app.status === "Accepted" ? (
                              <>
                                <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                                Accepted
                              </>
                            ) : "Accept"}
                          </button>
                          
                          <button 
                            onClick={() => handleStatusUpdate(app._id, "Rejected")}
                            disabled={app.status !== "Pending"}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              app.status === "Rejected" 
                                ? "bg-red-500 text-white cursor-default"
                                : app.status === "Pending"
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            {app.status === "Rejected" ? (
                              <>
                                <XCircleIcon className="w-4 h-4 inline mr-1" />
                                Rejected
                              </>
                            ) : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;