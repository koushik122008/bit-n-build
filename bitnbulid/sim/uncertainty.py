import numpy as np

def generate_default_covariance(position_sigma_km: float = 0.5, velocity_sigma_km_s: float = 0.001) -> np.ndarray:
    """
    Generate a 6x6 state covariance matrix for position [km] and velocity [km/s].
    """
    cov = np.eye(6)
    cov[0:3, 0:3] *= position_sigma_km ** 2
    cov[3:6, 3:6] *= velocity_sigma_km_s ** 2
    return cov

def project_covariance_2d(cov_3d: np.ndarray, relative_velocity: np.ndarray) -> np.ndarray:
    """
    Project 3D position covariance matrix onto 2D encounter plane perpendicular to relative velocity vector.
    """
    v_norm = np.linalg.norm(relative_velocity)
    if v_norm < 1e-9:
        return cov_3d[0:2, 0:2]

    h = relative_velocity / v_norm
    # Find perpendicular unit vectors
    if abs(h[0]) < 0.9:
        u = np.cross(h, np.array([1, 0, 0]))
    else:
        u = np.cross(h, np.array([0, 1, 0]))
    u /= np.linalg.norm(u)
    w = np.cross(h, u)

    projection_matrix = np.vstack([u, w]) # 2x3
    pos_cov_3d = cov_3d[0:3, 0:3]
    return projection_matrix @ pos_cov_3d @ projection_matrix.T
