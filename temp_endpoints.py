# Additional job management endpoints to be appended

@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a job (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    # Check if the job exists and belongs to the current client
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.client_id == client_profile.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to delete it"
        )
    
    # Delete the job
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully"}


@router.patch("/applications/{application_id}/accept")
async def accept_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a job application (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    # Get the application and verify ownership
    application = db.query(JobApplication).join(Job).filter(
        JobApplication.id == application_id,
        Job.client_id == client_profile.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or you don't have permission to manage it"
        )
    
    # Update application status
    application.status = ApplicationStatus.ACCEPTED
    db.commit()
    db.refresh(application)
    
    return {"message": "Application accepted successfully"}


@router.patch("/applications/{application_id}/reject")
async def reject_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a job application (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    # Get the application and verify ownership
    application = db.query(JobApplication).join(Job).filter(
        JobApplication.id == application_id,
        Job.client_id == client_profile.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or you don't have permission to manage it"
        )
    
    # Update application status
    application.status = ApplicationStatus.REJECTED
    db.commit()
    db.refresh(application)
    
    return {"message": "Application rejected successfully"}


@router.patch("/applications/{application_id}/withdraw")
async def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Withdraw a job application (applicant only)"""
    worker_profile = get_worker_profile(current_user, db)
    
    # Get the application and verify ownership
    application = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.worker_id == worker_profile.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or you don't have permission to withdraw it"
        )
    
    if application.status != ApplicationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending applications can be withdrawn"
        )
    
    # Delete the application
    db.delete(application)
    db.commit()
    
    return {"message": "Application withdrawn successfully"}
