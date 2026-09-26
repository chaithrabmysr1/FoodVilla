import React, { useId, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

// Labelled input used by the Login and Signup pages (styles: lg-* in Auth.css).
// A type="password" field gets a show/hide toggle.
const AuthField = ({
  label,
  icon: Icon,
  hint,
  className = "",
  type = "text",
  ...inputProps
}) => {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={`lg-field ${className}`.trim()}>
      <label className="lg-label" htmlFor={id}>
        {label}
      </label>
      <div className="lg-control">
        {Icon && <Icon aria-hidden="true" />}
        <input
          id={id}
          className="lg-input"
          type={isPassword && visible ? "text" : type}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="lg-toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
      </div>
      {hint && <span className="lg-hint">{hint}</span>}
    </div>
  );
};

export default AuthField;
