import { useState, useEffect } from 'react'
import api from '../services/api'
import './AdminLogs.css'

const AdminLogs = () => {
    const [logs, setLogs] = useState([])
    const [logType, setLogType] = useState('access')
    const [loading, setLoading] = useState(true)

    const fetchLogs = async (type) => {
        setLoading(true)
        try {
            const { data } = await api.get(`/admin/logs?type=${type}`)
            if (data.success) {
                setLogs(data.data.logs)
            }
        } catch (error) {
            console.error('Error fetching logs:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs(logType)
    }, [logType])

    const getLogLevelClass = (log) => {
        if (logType === 'error' || log.level === 'error') return 'level-error'
        if (logType === 'security' || log.level === 'warn') return 'level-warn'
        return 'level-info'
    }

    const formatMessage = (log) => {
        if (typeof log.message === 'string') return log.message
        return JSON.stringify(log.message)
    }

    const formatTimestamp = (ts) => {
        return new Date(ts).toLocaleString()
    }

    return (
        <div className="admin-logs-container">
            <div className="logs-controls">
                <div className="type-buttons">
                    <button
                        className={logType === 'access' ? 'active' : ''}
                        onClick={() => setLogType('access')}
                    >
                        Access Logs
                    </button>
                    <button
                        className={logType === 'error' ? 'active' : ''}
                        onClick={() => setLogType('error')}
                    >
                        Error Logs
                    </button>
                    <button
                        className={logType === 'security' ? 'active' : ''}
                        onClick={() => setLogType('security')}
                    >
                        Security Logs
                    </button>
                </div>
                <button className="refresh-btn" onClick={() => fetchLogs(logType)}>
                    🔄 Refresh
                </button>
            </div>

            <div className="logs-display">
                {loading ? (
                    <div className="loading-spinner">Fetching system logs...</div>
                ) : logs.length === 0 ? (
                    <div className="no-logs">No logs found for this type.</div>
                ) : (
                    <div className="logs-list">
                        <div className="logs-header">
                            <span className="col-time">Timestamp</span>
                            <span className="col-level">Level</span>
                            <span className="col-content">Log Content</span>
                        </div>
                        {logs.map((log, index) => (
                            <div key={index} className={`log-entry ${getLogLevelClass(log)}`}>
                                <span className="col-time">{formatTimestamp(log.timestamp)}</span>
                                <span className="col-level">{log.level?.toUpperCase() || logType.toUpperCase()}</span>
                                <span className="col-content">
                                    <span className="msg">{formatMessage(log)}</span>
                                    {log.details && (
                                        <pre className="details">{JSON.stringify(log.details, null, 2)}</pre>
                                    )}
                                    {log.stack && (
                                        <pre className="stack">{log.stack}</pre>
                                    )}
                                    {log.ip && <span className="meta">IP: {log.ip}</span>}
                                    {log.status && <span className="meta">Status: {log.status}</span>}
                                    {log.duration && <span className="meta">Duration: {log.duration}</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminLogs
