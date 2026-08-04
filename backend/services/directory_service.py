from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models import ActivityLog, StoredFile, User


def _format_size(bytes_count: int) -> str:
    if bytes_count < 1024:
        return f"{bytes_count} B"
    if bytes_count < 1024 * 1024:
        return f"{bytes_count / 1024:.1f} KB"
    return f"{bytes_count / (1024 * 1024):.1f} MB"


class DirectoryService:
    @staticmethod
    def create_folder(
        db: Session,
        user: User,
        name: str,
        parent_id: int | None = None,
    ) -> StoredFile:
        # Validate parent if provided
        if parent_id is not None:
            parent = (
                db.query(StoredFile)
                .filter(
                    StoredFile.id == parent_id,
                    StoredFile.owner_id == user.id,
                    StoredFile.is_directory == True,
                )
                .first()
            )
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent folder not found",
                )

        # Check duplicate folder name in same parent
        existing = (
            db.query(StoredFile)
            .filter(
                StoredFile.owner_id == user.id,
                StoredFile.is_directory == True,
                StoredFile.filename_original == name,
                StoredFile.parent_id == parent_id
                if parent_id
                else StoredFile.parent_id.is_(None),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A folder with this name already exists in this location",
            )

        folder = StoredFile(
            owner_id=user.id,
            filename_original=name,
            filename_stored=f"dir_{name}_{user.id}",  # directories don't use storage
            mime_type="directory",
            file_size_original=0,
            file_size_encrypted=0,
            encryption_type="N/A",
            parent_id=parent_id,
            is_directory=True,
        )
        db.add(folder)
        db.commit()
        db.refresh(folder)
        return folder

    @staticmethod
    def list_contents(
        db: Session,
        user: User,
        parent_id: int | None = None,
    ) -> dict:
        # Build breadcrumb path
        breadcrumb = DirectoryService.get_breadcrumb(db, user, parent_id)

        # List items in the folder
        query = (
            db.query(StoredFile)
            .filter(
                StoredFile.owner_id == user.id,
                StoredFile.parent_id == parent_id
                if parent_id
                else StoredFile.parent_id.is_(None),
            )
            .order_by(StoredFile.is_directory.desc(), StoredFile.created_at.desc())
        )
        items = query.all()

        serialized = [
            {
                "id": item.id,
                "name": item.filename_original,
                "is_directory": item.is_directory,
                "parent_id": item.parent_id,
                "owner_id": item.owner_id,
                "file_size_original": item.file_size_original,
                "file_size_formatted": _format_size(item.file_size_original)
                if not item.is_directory
                else "",
                "mime_type": item.mime_type,
                "encryption_type": item.encryption_type,
                "created_at": item.created_at,
            }
            for item in items
        ]

        return {
            "current_path": breadcrumb,
            "items": serialized,
            "total": len(serialized),
        }

    @staticmethod
    def get_breadcrumb(db: Session, user: User, folder_id: int | None) -> list[dict]:
        path = []
        current_id = folder_id
        visited = set()

        while current_id is not None and current_id not in visited:
            visited.add(current_id)
            folder = (
                db.query(StoredFile)
                .filter(
                    StoredFile.id == current_id,
                    StoredFile.owner_id == user.id,
                    StoredFile.is_directory == True,
                )
                .first()
            )
            if not folder:
                break
            path.append({"id": folder.id, "name": folder.filename_original})
            current_id = folder.parent_id

        path.reverse()
        return path

    @staticmethod
    def move_item(
        db: Session,
        user: User,
        item_id: int,
        target_parent_id: int | None,
    ) -> dict:
        item = (
            db.query(StoredFile)
            .filter(
                StoredFile.id == item_id,
                StoredFile.owner_id == user.id,
            )
            .first()
        )
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File or folder not found",
            )

        # Validate target folder
        if target_parent_id is not None:
            target = (
                db.query(StoredFile)
                .filter(
                    StoredFile.id == target_parent_id,
                    StoredFile.owner_id == user.id,
                    StoredFile.is_directory == True,
                )
                .first()
            )
            if not target:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target folder not found",
                )

            # Prevent moving folder into itself or its descendants
            if item.is_directory:
                if target_parent_id == item.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot move a folder into itself",
                    )
                if DirectoryService._is_descendant(db, user, item.id, target_parent_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot move a folder into its own subfolder",
                    )
        else:
            target = None

        item.parent_id = target_parent_id
        db.commit()

        return {"message": f"Moved '{item.filename_original}' successfully"}

    @staticmethod
    def _is_descendant(
        db: Session, user: User, folder_id: int, candidate_id: int
    ) -> bool:
        """Check if candidate_id is a descendant of folder_id."""
        visited = set()
        queue = [folder_id]
        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)
            children = (
                db.query(StoredFile)
                .filter(
                    StoredFile.parent_id == current,
                    StoredFile.owner_id == user.id,
                    StoredFile.is_directory == True,
                )
                .all()
            )
            for child in children:
                if child.id == candidate_id:
                    return True
                queue.append(child.id)
        return False

    @staticmethod
    def delete_folder(
        db: Session,
        user: User,
        folder_id: int,
    ) -> dict:
        folder = (
            db.query(StoredFile)
            .filter(
                StoredFile.id == folder_id,
                StoredFile.owner_id == user.id,
                StoredFile.is_directory == True,
            )
            .first()
        )
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found",
            )

        DirectoryService._delete_recursive(db, user, folder)

        db.add(
            ActivityLog(
                user_id=user.id,
                action="delete_folder",
                details=f"Deleted folder '{folder.filename_original}'",
            )
        )
        db.commit()
        return {"message": "Folder deleted successfully"}

    @staticmethod
    def _delete_recursive(db: Session, user: User, folder: StoredFile) -> None:
        """Recursively delete folder contents, then the folder itself."""
        children = db.query(StoredFile).filter(StoredFile.parent_id == folder.id).all()
        for child in children:
            if child.is_directory:
                DirectoryService._delete_recursive(db, user, child)
            else:
                # Delete file's storage and related records
                from backend.models import FileKey, Share
                from backend.storage import storage

                if storage.exists(child.filename_stored):
                    storage.delete(child.filename_stored)
                db.query(FileKey).filter(FileKey.file_id == child.id).delete()
                db.query(Share).filter(Share.file_id == child.id).delete()
                db.delete(child)
        db.delete(folder)
