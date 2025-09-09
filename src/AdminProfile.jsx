// src/AdminProfile.jsx
import React, { useCallback, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  inwardNumber: yup.string().required('Inward number is required'),
  inwardDate: yup.date().nullable().required('Inward date is required'),
  receivingDate: yup.date().nullable().required('Receiving date is required'),
  department: yup.string().required('Department is required'),
  receivedFrom: yup.string().required('Received From is required'),
  subject: yup.string().required('Subject is required'),
  allocatedTo: yup.string().required('Allocated To is required'),
  status: yup.string().required('Status is required'),
});

export default function AdminProfile() {
  const [files, setFiles] = useState([]);
  const dropRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      inwardNumber: '',
      inwardDate: null,
      receivingDate: null,
      department: '',
      receivedFrom: '',
      subject: '',
      allocatedTo: '',
      status: '',
    },
  });

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const incoming = Array.from(e.dataTransfer.files || []);
    setFiles((prev) => [...prev, ...incoming]);
  }, []);

  const onChoose = (e) => {
    const incoming = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...incoming]);
  };

  const prevent = (e) => e.preventDefault();

  const onSubmit = async (values) => {
    // Mock submit; replace with API call
    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) =>
      formData.append(k, v instanceof Date ? v.toISOString() : v)
    );
    files.forEach((f) => formData.append('files', f));
    // await fetch('/api/files', { method:'POST', body: formData });
    alert('Form submitted! Check console for payload.');
    console.log('payload', values, files);
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: 16 }}>Admin Profile</h2>

      <div className="card">
        <div className="card-header">File Upload</div>

        <div style={{ padding: 20 }} className="grid" >
          <div
            className="dashed"
            ref={dropRef}
            onDragOver={prevent}
            onDragEnter={prevent}
            onDrop={onDrop}
          >
            <div style={{ fontSize: 14, marginBottom: 10 }}>
              Drag and drop files here or
            </div>
            <label className="button" style={{ background: '#2563eb', display: 'inline-block' }}>
              Choose Files
              <input type="file" multiple onChange={onChoose} hidden />
            </label>
            {files.length > 0 && (
              <div className="helper" style={{ marginTop: 8 }}>
                {files.length} file(s) selected
              </div>
            )}
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Inward Number</label>
              <input className="input" placeholder="Enter inward number"
                {...register('inwardNumber')} />
              {errors.inwardNumber && (
                <div className="helper" style={{ color: 'crimson' }}>
                  {errors.inwardNumber.message}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} className="calendar-input">
              <label className="label">Inward Date</label>
              <DatePicker
                className="input"
                selected={watch('inwardDate')}
                onChange={(d) => setValue('inwardDate', d, { shouldValidate: true })}
                placeholderText="mm/dd/yyyy"
              />
              {errors.inwardDate && (
                <div className="helper" style={{ color: 'crimson' }}>
                  {errors.inwardDate.message}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} className="calendar-input">
              <label className="label">Receiving Date</label>
              <DatePicker
                className="input"
                selected={watch('receivingDate')}
                onChange={(d) => setValue('receivingDate', d, { shouldValidate: true })}
                placeholderText="mm/dd/yyyy"
              />
              {errors.receivingDate && (
                <div className="helper" style={{ color: 'crimson' }}>
                  {errors.receivingDate.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="card">
        <div className="card-header">Assignment Details</div>
        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: 20 }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="row">
              <div style={{ flex: 1 }}>
                <label className="label">Department</label>
                <select className="select" {...register('department')}>
                  <option value="">Select Department</option>
                  <option>Administration</option>
                  <option>Finance</option>
                  <option>HR</option>
                  <option>IT</option>
                  <option>Operations</option>
                </select>
                {errors.department && (
                  <div className="helper" style={{ color: 'crimson' }}>
                    {errors.department.message}
                  </div>
                )}
              </div>
            </div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <label className="label">Received From</label>
                <input className="input" placeholder="Enter sender name or organization" {...register('receivedFrom')} />
                {errors.receivedFrom && <div className="helper" style={{ color: 'crimson' }}>{errors.receivedFrom.message}</div>}
              </div>
            </div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <label className="label">Subject</label>
                <input className="input" placeholder="Enter sender name or organization" {...register('subject')} />
                {errors.subject && <div className="helper" style={{ color: 'crimson' }}>{errors.subject.message}</div>}
              </div>
            </div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <label className="label">Allocated To</label>
                <input className="input" placeholder="Enter name" {...register('allocatedTo')} />
                {errors.allocatedTo && <div className="helper" style={{ color: 'crimson' }}>{errors.allocatedTo.message}</div>}
              </div>
            </div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <label className="label">Status</label>
                <select className="select" {...register('status')}>
                  <option value="">Select Status</option>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Closed</option>
                  <option>On Hold</option>
                </select>
                {errors.status && <div className="helper" style={{ color: 'crimson' }}>{errors.status.message}</div>}
              </div>
              <div style={{ alignSelf: 'end' }}>
                <button type="submit" className="button" disabled={isSubmitting}>
                  Save File Record
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
